import type { EventoHeartbeat, EventoOcupacao } from '../contrato/eventos.js';

/**
 * Para onde uma fonte entrega o que observou. É o único ponto de contato entre
 * o mundo externo e o resto do backend.
 */
export interface ColetorDeEventos {
  ocupacao(evento: EventoOcupacao): void;
  heartbeat(evento: EventoHeartbeat): void;
}

/**
 * Uma origem de eventos de ocupação: a maquete via MQTT, sensores reais no
 * campus, ou um simulador. Trocar de implementação não altera nada abaixo —
 * é o princípio da seção 1 do CLAUDE.md, escrito como interface.
 */
export interface FonteDeEventos {
  readonly nome: string;
  /** Descrição legível para o endpoint de saúde e para os logs. */
  readonly descricao: string;
  iniciar(coletor: ColetorDeEventos): Promise<void>;
  parar(): Promise<void>;
  /** `false` enquanto a fonte estiver desconectada ou sem publicar. */
  estaSaudavel(): boolean;
}
