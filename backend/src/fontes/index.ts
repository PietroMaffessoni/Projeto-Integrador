import { config } from '../config.js';
import { FonteMqtt } from './fonte-mqtt.js';
import { FonteSimulada } from './fonte-simulada.js';
import type { FonteDeEventos } from './fonte.js';

/**
 * Única linha do sistema que decide de onde vêm os eventos.
 *
 * Trocar maquete por simulador no meio da apresentação é mudar `FONTE_EVENTOS`
 * e reiniciar o backend — o app não percebe (CLAUDE.md, seção 13).
 */
export function criarFonteDeEventos(): FonteDeEventos {
  return config.fonteEventos === 'simulador' ? new FonteSimulada() : new FonteMqtt();
}

export type { ColetorDeEventos, FonteDeEventos } from './fonte.js';
