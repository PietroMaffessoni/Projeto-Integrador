/**
 * O contrato entre as camadas é sempre o mesmo evento: "a vaga X mudou para o
 * estado Y no instante Z" (CLAUDE.md, seção 1).
 *
 * Nada abaixo desta linha sabe se o evento nasceu num sensor infravermelho, num
 * simulador ou numa chamada de demonstração — e é exatamente isso que torna as
 * fontes intercambiáveis.
 */

import type { Estado, EstadoMedido, TipoVaga, VagaId } from './vagas.js';

/** De onde o evento veio. Serve para diagnóstico, nunca para regra de negócio. */
export type OrigemEvento = 'mqtt' | 'simulador' | 'demo';

export interface EventoOcupacao {
  vagaId: VagaId;
  estado: EstadoMedido;
  ocorridoEm: Date;
  origem: OrigemEvento;
  rssi?: number;
}

export interface EventoHeartbeat {
  controladorId: string;
  recebidoEm: Date;
  online: boolean;
  origem: OrigemEvento;
  rssi?: number;
}

/** Estado corrente de uma vaga, como sai na API e no WebSocket. */
export interface VagaAtual {
  id: VagaId;
  fileira: string;
  posicao: number;
  tipo: TipoVaga;
  estado: Estado;
  atualizadoEm: string | null;
  /** Há quanto tempo está neste estado, em segundos. `null` se nunca reportou. */
  haSegundos: number | null;
}

/** Evento empurrado pelo servidor no WebSocket. */
export const EVENTO_WS_MUDANCA = 'vaga:mudou';
export const EVENTO_WS_ALERTA = 'alerta:anomalia';

export interface MensagemMudanca {
  vaga: VagaId;
  estado: Estado;
}
