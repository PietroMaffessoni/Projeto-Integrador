/**
 * Contrato MQTT (CLAUDE.md, seção 6). Este arquivo é a tradução em código de
 * `docs/contrato-de-dados.md`; firmware e simulador replicam estes formatos.
 */

import { z } from 'zod';
import { ESTADOS_MEDIDOS } from './vagas.js';

export const PREFIXO_PADRAO = 'maua/estacionamento';

export function topicoVaga(prefixo: string, id: string): string {
  return `${prefixo}/vaga/${id}`;
}

export function topicoTodasAsVagas(prefixo: string): string {
  return `${prefixo}/vaga/+`;
}

export function topicoHeartbeat(prefixo: string, idPlaca: string): string {
  return `${prefixo}/controlador/${idPlaca}/heartbeat`;
}

export function topicoTodosOsHeartbeats(prefixo: string): string {
  return `${prefixo}/controlador/+/heartbeat`;
}

/** Extrai o id da vaga de `.../vaga/A3`; `null` se o tópico não casar. */
export function vagaDoTopico(prefixo: string, topico: string): string | null {
  const inicio = `${prefixo}/vaga/`;
  if (!topico.startsWith(inicio)) return null;
  const resto = topico.slice(inicio.length);
  return resto.includes('/') || resto.length === 0 ? null : resto;
}

/** Extrai o id do controlador de `.../controlador/placa-01/heartbeat`. */
export function controladorDoTopico(prefixo: string, topico: string): string | null {
  const inicio = `${prefixo}/controlador/`;
  const fim = '/heartbeat';
  if (!topico.startsWith(inicio) || !topico.endsWith(fim)) return null;
  const id = topico.slice(inicio.length, topico.length - fim.length);
  return id.length > 0 && !id.includes('/') ? id : null;
}

export const esquemaPayloadVaga = z.object({
  estado: z.enum(ESTADOS_MEDIDOS),
  timestamp: z.string().datetime({ offset: true }).optional(),
  rssi: z.number().int().optional(),
});
export type PayloadVaga = z.infer<typeof esquemaPayloadVaga>;

export const esquemaPayloadHeartbeat = z.object({
  /** `ONLINE` no heartbeat normal; `OFFLINE` na última vontade (LWT) da placa. */
  estado: z.enum(['ONLINE', 'OFFLINE']).default('ONLINE'),
  timestamp: z.string().datetime({ offset: true }).optional(),
  rssi: z.number().int().optional(),
  uptime_s: z.number().int().nonnegative().optional(),
  firmware: z.string().optional(),
});
export type PayloadHeartbeat = z.infer<typeof esquemaPayloadHeartbeat>;

/** Intervalo de heartbeat publicado pelo firmware (CLAUDE.md, seção 6). */
export const INTERVALO_HEARTBEAT_MS = 30_000;

/** Silêncio a partir do qual o controlador é considerado fora do ar. */
export const TIMEOUT_HEARTBEAT_MS = 120_000;
