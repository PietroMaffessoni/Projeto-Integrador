import { config } from '../config.js';
import type { EventoHeartbeat } from '../contrato/eventos.js';
import type { RegistroControlador, Repositorio } from '../dados/repositorio.js';
import { log } from '../log.js';
import type { ServicoDeEstado } from './servico-estado.js';

/** De quanto em quanto tempo se verifica o silêncio dos controladores. */
const INTERVALO_VERIFICACAO_MS = 10_000;

interface Vigiado {
  id: string;
  ultimoHeartbeat: Date | null;
  online: boolean;
  rssi: number | null;
  /** Já foram derrubadas as vagas deste controlador? Evita repetir o trabalho. */
  derrubado: boolean;
}

/**
 * Vigia o sinal de vida dos controladores.
 *
 * Sem isto, uma placa que caísse deixaria a tela congelada no último estado
 * conhecido — e uma vaga "livre" que na verdade está ocupada é pior do que não
 * informar nada. Passados dois minutos sem heartbeat, as vagas daquele
 * controlador viram OFFLINE (CLAUDE.md, seções 6 e 10).
 */
export class MonitorDeHeartbeat {
  private readonly vigiados = new Map<string, Vigiado>();
  private verificador: NodeJS.Timeout | null = null;

  constructor(
    private readonly estado: ServicoDeEstado,
    private readonly repositorio: Repositorio,
  ) {}

  async iniciar(): Promise<void> {
    // Recupera o que se sabia antes do restart, para não zerar o julgamento.
    for (const registro of await this.repositorio.listarControladores()) {
      this.vigiados.set(registro.id, {
        id: registro.id,
        ultimoHeartbeat: registro.ultimoHeartbeat,
        online: false, // até o próximo batimento, ninguém está vivo por decreto
        rssi: registro.rssi,
        derrubado: false,
      });
    }

    if (!this.vigiados.has(config.controladorPadrao)) {
      this.vigiados.set(config.controladorPadrao, {
        id: config.controladorPadrao,
        ultimoHeartbeat: null,
        online: false,
        rssi: null,
        derrubado: false,
      });
    }

    this.verificador = setInterval(() => void this.verificar(), INTERVALO_VERIFICACAO_MS);
    await this.verificar();
  }

  registrar(evento: EventoHeartbeat): void {
    const anterior = this.vigiados.get(evento.controladorId);

    const vigiado: Vigiado = {
      id: evento.controladorId,
      ultimoHeartbeat: evento.recebidoEm,
      online: evento.online,
      rssi: evento.rssi ?? anterior?.rssi ?? null,
      derrubado: evento.online ? false : (anterior?.derrubado ?? false),
    };
    this.vigiados.set(evento.controladorId, vigiado);

    if (!anterior?.online && evento.online) {
      log.info('heartbeat', `${evento.controladorId} está vivo (rssi ${vigiado.rssi ?? '?'} dBm)`);
    }

    // Última vontade (LWT) publicada pelo broker quando a placa cai: não há por
    // que esperar os dois minutos, o próprio broker já avisou.
    if (!evento.online && !anterior?.derrubado) {
      log.aviso('heartbeat', `${evento.controladorId} anunciou queda (LWT)`);
      vigiado.derrubado = true;
      void this.derrubar(evento.controladorId, evento.recebidoEm);
    }

    void this.persistir(vigiado);
  }

  private async verificar(): Promise<void> {
    const agora = Date.now();

    for (const vigiado of this.vigiados.values()) {
      const silencio = vigiado.ultimoHeartbeat
        ? agora - vigiado.ultimoHeartbeat.getTime()
        : Number.POSITIVE_INFINITY;

      if (silencio <= config.timeoutHeartbeatMs) continue;
      if (vigiado.derrubado) continue;

      if (vigiado.online) {
        const segundos = Math.round(silencio / 1000);
        log.aviso('heartbeat', `${vigiado.id} sem sinal há ${segundos}s — vagas viram OFFLINE`);
      }

      vigiado.online = false;
      vigiado.derrubado = true;
      await this.derrubar(vigiado.id, new Date());
      await this.persistir(vigiado);
    }
  }

  private async derrubar(controladorId: string, em: Date): Promise<void> {
    const ids = await this.repositorio.vagasDoControlador(controladorId);
    const mudadas = this.estado.marcarOffline(ids, em);
    if (mudadas > 0) {
      log.aviso('heartbeat', `${mudadas} vaga(s) marcada(s) OFFLINE por silêncio de ${controladorId}`);
    }
  }

  private async persistir(vigiado: Vigiado): Promise<void> {
    const registro: RegistroControlador = {
      id: vigiado.id,
      online: vigiado.online,
      ultimoHeartbeat: vigiado.ultimoHeartbeat,
      rssi: vigiado.rssi,
    };
    try {
      await this.repositorio.salvarHeartbeat(registro);
    } catch (erro) {
      log.erro('heartbeat', `falha ao gravar ${vigiado.id}: ${erro instanceof Error ? erro.message : erro}`);
    }
  }

  situacao(): Array<RegistroControlador & { silencioSegundos: number | null }> {
    const agora = Date.now();
    return [...this.vigiados.values()].map((v) => ({
      id: v.id,
      online: v.online,
      ultimoHeartbeat: v.ultimoHeartbeat,
      rssi: v.rssi,
      silencioSegundos: v.ultimoHeartbeat
        ? Math.round((agora - v.ultimoHeartbeat.getTime()) / 1000)
        : null,
    }));
  }

  parar(): void {
    if (this.verificador) clearInterval(this.verificador);
    this.verificador = null;
  }
}
