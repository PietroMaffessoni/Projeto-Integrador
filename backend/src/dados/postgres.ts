import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

/**
 * `timestamptz` chega como string e vira `Date` pelo driver. Já `int8`
 * (BIGSERIAL, COUNT) o pg devolve como string para não perder precisão — como
 * nossos contadores cabem folgadamente em `number`, converte-se na leitura.
 */
pg.types.setTypeParser(20, (valor: string) => Number(valor));
/** `numeric` (as taxas de ocupação) também vem como string por padrão. */
pg.types.setTypeParser(1700, (valor: string) => Number(valor));

let pool: pg.Pool | null = null;

export function obterPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
    });

    // As consultas de previsão agrupam por dia da semana e hora local. Sem fixar
    // o fuso, o resultado mudaria conforme o fuso do servidor.
    pool.on('connect', (cliente) => {
      void cliente.query("SET TIME ZONE 'America/Sao_Paulo'");
    });

    pool.on('error', (erro) => {
      console.error('[postgres] erro no pool ocioso:', erro.message);
    });
  }
  return pool;
}

export async function encerrarPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
