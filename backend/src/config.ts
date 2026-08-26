import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PREFIXO_PADRAO, TIMEOUT_HEARTBEAT_MS } from './contrato/mqtt.js';

/** Lê o .env sem dependência externa: são seis variáveis, não precisa de lib. */
function carregarArquivoEnv(): void {
  try {
    const conteudo = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const linha of conteudo.split(/\r?\n/)) {
      const limpa = linha.trim();
      if (!limpa || limpa.startsWith('#')) continue;
      const separador = limpa.indexOf('=');
      if (separador < 0) continue;
      const chave = limpa.slice(0, separador).trim();
      const valor = limpa.slice(separador + 1).trim().replace(/^["']|["']$/g, '');
      if (!(chave in process.env)) process.env[chave] = valor;
    }
  } catch {
    // Sem .env: os padrões abaixo bastam para rodar em modo demonstração.
  }
}

carregarArquivoEnv();

function texto(chave: string, padrao: string): string {
  const valor = process.env[chave];
  return valor === undefined || valor === '' ? padrao : valor;
}

function numero(chave: string, padrao: number): number {
  const valor = Number(process.env[chave]);
  return Number.isFinite(valor) ? valor : padrao;
}

function booleano(chave: string, padrao: boolean): boolean {
  const valor = process.env[chave]?.toLowerCase();
  if (valor === undefined || valor === '') return padrao;
  return valor === 'true' || valor === '1' || valor === 'sim';
}

export type FonteEventos = 'mqtt' | 'simulador';
export type ModoPersistencia = 'postgres' | 'memoria';

export const config = {
  porta: numero('PORTA', 3333),
  host: texto('HOST', '0.0.0.0'),
  nivelLog: texto('NIVEL_LOG', 'info'),

  fonteEventos: texto('FONTE_EVENTOS', 'mqtt') as FonteEventos,

  mqtt: {
    url: texto('MQTT_URL', 'mqtt://localhost:1883'),
    usuario: texto('MQTT_USUARIO', ''),
    senha: texto('MQTT_SENHA', ''),
    prefixo: texto('PREFIXO_MQTT', PREFIXO_PADRAO),
  },

  persistencia: texto('PERSISTENCIA', 'postgres') as ModoPersistencia,
  databaseUrl: texto('DATABASE_URL', 'postgres://vagas:vagas@localhost:5432/vagas'),

  timeoutHeartbeatMs: numero('TIMEOUT_HEARTBEAT_MS', TIMEOUT_HEARTBEAT_MS),
  controladorPadrao: texto('CONTROLADOR_PADRAO', 'placa-01'),

  permitirDemo: booleano('PERMITIR_DEMO', false),
} as const;

export function validarConfig(): void {
  if (config.fonteEventos !== 'mqtt' && config.fonteEventos !== 'simulador') {
    throw new Error(
      `FONTE_EVENTOS inválida: "${config.fonteEventos}". Use "mqtt" ou "simulador".`,
    );
  }
  if (config.persistencia !== 'postgres' && config.persistencia !== 'memoria') {
    throw new Error(
      `PERSISTENCIA inválida: "${config.persistencia}". Use "postgres" ou "memoria".`,
    );
  }
}
