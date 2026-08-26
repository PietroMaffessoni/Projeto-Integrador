/**
 * Cópia mínima do contrato de dados (docs/contrato-de-dados.md).
 *
 * A duplicação é deliberada: o simulador ocupa o lugar da maquete, e a maquete
 * também não importa código do backend — ela fala MQTT. Se o simulador
 * compartilhasse tipos com quem o consome, deixaria de testar o contrato e
 * passaria a testar a si mesmo.
 */

export const PREFIXO_PADRAO = 'maua/estacionamento';

export type Estado = 'LIVRE' | 'OCUPADA';

export const IDS_VAGAS: readonly string[] = ['A', 'B'].flatMap((fileira) =>
  Array.from({ length: 8 }, (_, i) => `${fileira}${i + 1}`),
);

export function topicoVaga(prefixo: string, id: string): string {
  return `${prefixo}/vaga/${id}`;
}

export function topicoHeartbeat(prefixo: string, idPlaca: string): string {
  return `${prefixo}/controlador/${idPlaca}/heartbeat`;
}

export interface PayloadVaga {
  estado: Estado;
  timestamp: string;
  rssi: number;
}

export interface PayloadHeartbeat {
  estado: 'ONLINE' | 'OFFLINE';
  timestamp: string;
  rssi: number;
  uptime_s: number;
  firmware: string;
}

export const INTERVALO_HEARTBEAT_MS = 30_000;
