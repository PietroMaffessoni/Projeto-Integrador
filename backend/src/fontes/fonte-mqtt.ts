import mqtt, { type MqttClient } from 'mqtt';
import { config } from '../config.js';
import {
  controladorDoTopico,
  esquemaPayloadHeartbeat,
  esquemaPayloadVaga,
  topicoTodasAsVagas,
  topicoTodosOsHeartbeats,
  vagaDoTopico,
} from '../contrato/mqtt.js';
import { normalizarVagaId } from '../contrato/vagas.js';
import { log } from '../log.js';
import type { ColetorDeEventos, FonteDeEventos } from './fonte.js';

/**
 * Assina o broker e traduz mensagens MQTT em eventos de domínio.
 *
 * Como o firmware publica com `retained`, ao (re)conectar o broker devolve
 * imediatamente o estado corrente das 16 vagas — não é preciso esperar um
 * carrinho se mover para a tela ficar correta (CLAUDE.md, seção 6).
 */
export class FonteMqtt implements FonteDeEventos {
  readonly nome = 'mqtt';
  readonly descricao = `MQTT ${config.mqtt.url} (${config.mqtt.prefixo})`;

  private cliente: MqttClient | null = null;
  private conectado = false;

  async iniciar(coletor: ColetorDeEventos): Promise<void> {
    const opcoes = {
      clientId: `backend-vagas-${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 2_000,
      connectTimeout: 10_000,
      ...(config.mqtt.usuario ? { username: config.mqtt.usuario, password: config.mqtt.senha } : {}),
    };

    const cliente = mqtt.connect(config.mqtt.url, opcoes);
    this.cliente = cliente;

    cliente.on('connect', () => {
      this.conectado = true;
      const topicos = [
        topicoTodasAsVagas(config.mqtt.prefixo),
        topicoTodosOsHeartbeats(config.mqtt.prefixo),
      ];
      cliente.subscribe(topicos, { qos: 1 }, (erro) => {
        if (erro) log.erro('mqtt', `falha ao assinar: ${erro.message}`);
        else log.info('mqtt', `conectado — assinando ${topicos.join(', ')}`);
      });
    });

    cliente.on('reconnect', () => log.aviso('mqtt', 'reconectando…'));
    cliente.on('close', () => {
      if (this.conectado) log.aviso('mqtt', 'conexão encerrada');
      this.conectado = false;
    });
    cliente.on('error', (erro) => log.erro('mqtt', erro.message));

    cliente.on('message', (topico, payload) => {
      this.processar(topico, payload, coletor);
    });

    // Não bloqueia a subida do servidor: sem broker, o backend fica no ar
    // servindo tudo OFFLINE — que é a resposta honesta.
    await Promise.resolve();
  }

  private processar(topico: string, payload: Buffer, coletor: ColetorDeEventos): void {
    let corpo: unknown;
    try {
      corpo = JSON.parse(payload.toString('utf8'));
    } catch {
      log.aviso('mqtt', `payload não-JSON em ${topico}: ${payload.toString('utf8').slice(0, 60)}`);
      return;
    }

    const idVagaBruto = vagaDoTopico(config.mqtt.prefixo, topico);
    if (idVagaBruto !== null) {
      const vagaId = normalizarVagaId(idVagaBruto);
      if (!vagaId) {
        log.aviso('mqtt', `vaga desconhecida no tópico ${topico} — ignorada`);
        return;
      }

      const analise = esquemaPayloadVaga.safeParse(corpo);
      if (!analise.success) {
        log.aviso('mqtt', `payload inválido para ${vagaId}: ${analise.error.issues[0]?.message}`);
        return;
      }

      coletor.ocupacao({
        vagaId,
        estado: analise.data.estado,
        // O relógio do ESP32 pode não estar sincronizado; sem timestamp válido,
        // vale a hora de chegada no backend.
        ocorridoEm: analise.data.timestamp ? new Date(analise.data.timestamp) : new Date(),
        origem: 'mqtt',
        ...(analise.data.rssi !== undefined ? { rssi: analise.data.rssi } : {}),
      });
      return;
    }

    const controladorId = controladorDoTopico(config.mqtt.prefixo, topico);
    if (controladorId !== null) {
      const analise = esquemaPayloadHeartbeat.safeParse(corpo);
      if (!analise.success) {
        log.aviso('mqtt', `heartbeat inválido de ${controladorId}`);
        return;
      }

      coletor.heartbeat({
        controladorId,
        recebidoEm: new Date(),
        online: analise.data.estado === 'ONLINE',
        origem: 'mqtt',
        ...(analise.data.rssi !== undefined ? { rssi: analise.data.rssi } : {}),
      });
    }
  }

  estaSaudavel(): boolean {
    return this.conectado;
  }

  async parar(): Promise<void> {
    await new Promise<void>((resolver) => {
      if (!this.cliente) return resolver();
      this.cliente.end(false, {}, () => resolver());
    });
    this.cliente = null;
    this.conectado = false;
  }
}
