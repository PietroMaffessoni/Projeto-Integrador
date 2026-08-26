import { config } from '../config.js';
import { INTERVALO_HEARTBEAT_MS } from '../contrato/mqtt.js';
import { IDS_VAGAS } from '../contrato/vagas.js';
import type { EstadoMedido, VagaId } from '../contrato/vagas.js';
import { log } from '../log.js';
import type { ColetorDeEventos, FonteDeEventos } from './fonte.js';

/** Quanto tempo um carro fica parado, em segundos (mín, máx). */
const PERMANENCIA_OCUPADA = [25, 150] as const;
/** Quanto tempo a vaga fica vazia até chegar outro carro. */
const PERMANENCIA_LIVRE = [15, 120] as const;

function sorteioEntre([min, max]: readonly [number, number]): number {
  return (min + Math.random() * (max - min)) * 1000;
}

/**
 * Fonte simulada **dentro do processo** do backend: nem broker, nem fios.
 *
 * É a irmã menor do pacote `/simulador`, que faz o mesmo publicando MQTT de
 * verdade. Esta existe para o caso `npm run dev:demo`, em que o sistema inteiro
 * precisa subir com um comando só.
 */
export class FonteSimulada implements FonteDeEventos {
  readonly nome = 'simulador';
  readonly descricao = 'simulador interno (sem MQTT, sem hardware)';

  private readonly temporizadores = new Map<VagaId, NodeJS.Timeout>();
  private batimento: NodeJS.Timeout | null = null;
  private rodando = false;

  async iniciar(coletor: ColetorDeEventos): Promise<void> {
    this.rodando = true;

    // Estado inicial das 16 vagas: equivale às mensagens retained que o broker
    // devolveria na conexão.
    for (const vagaId of IDS_VAGAS) {
      const estado: EstadoMedido = Math.random() < 0.45 ? 'OCUPADA' : 'LIVRE';
      coletor.ocupacao({ vagaId, estado, ocorridoEm: new Date(), origem: 'simulador' });
      this.agendar(vagaId, estado, coletor);
    }

    const pulsar = (): void => {
      coletor.heartbeat({
        controladorId: config.controladorPadrao,
        recebidoEm: new Date(),
        online: true,
        origem: 'simulador',
        rssi: -50 - Math.round(Math.random() * 20),
      });
    };
    pulsar();
    this.batimento = setInterval(pulsar, INTERVALO_HEARTBEAT_MS);

    log.info('simulador', `movimentando ${IDS_VAGAS.length} vagas`);
  }

  private agendar(vagaId: VagaId, estadoAtual: EstadoMedido, coletor: ColetorDeEventos): void {
    const espera = sorteioEntre(estadoAtual === 'OCUPADA' ? PERMANENCIA_OCUPADA : PERMANENCIA_LIVRE);

    const temporizador = setTimeout(() => {
      if (!this.rodando) return;
      const proximo: EstadoMedido = estadoAtual === 'OCUPADA' ? 'LIVRE' : 'OCUPADA';
      coletor.ocupacao({ vagaId, estado: proximo, ocorridoEm: new Date(), origem: 'simulador' });
      this.agendar(vagaId, proximo, coletor);
    }, espera);

    this.temporizadores.set(vagaId, temporizador);
  }

  estaSaudavel(): boolean {
    return this.rodando;
  }

  async parar(): Promise<void> {
    this.rodando = false;
    for (const temporizador of this.temporizadores.values()) clearTimeout(temporizador);
    this.temporizadores.clear();
    if (this.batimento) clearInterval(this.batimento);
    this.batimento = null;
  }
}
