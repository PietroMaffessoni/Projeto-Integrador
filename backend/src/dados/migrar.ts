/**
 * Aplica as migrações em ordem e semeia as 16 vagas.
 * Idempotente: rodar duas vezes não faz nada na segunda.
 *
 *   npm run migrar
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, validarConfig } from '../config.js';
import { IDS_VAGAS, decomporVagaId, tipoDaVaga } from '../contrato/vagas.js';
import { encerrarPool, obterPool } from './postgres.js';

const pastaMigracoes = join(dirname(fileURLToPath(import.meta.url)), 'migracoes');

async function migrar(): Promise<void> {
  validarConfig();

  if (config.persistencia !== 'postgres') {
    console.log('PERSISTENCIA=memoria — nada a migrar.');
    return;
  }

  const pool = obterPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migracoes (
      nome       TEXT PRIMARY KEY,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const arquivos = readdirSync(pastaMigracoes)
    .filter((nome) => nome.endsWith('.sql'))
    .sort();

  for (const arquivo of arquivos) {
    const { rowCount } = await pool.query('SELECT 1 FROM _migracoes WHERE nome = $1', [arquivo]);
    if (rowCount) {
      console.log(`  · ${arquivo} (já aplicada)`);
      continue;
    }

    const sql = readFileSync(join(pastaMigracoes, arquivo), 'utf8');
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(sql);
      await cliente.query('INSERT INTO _migracoes (nome) VALUES ($1)', [arquivo]);
      await cliente.query('COMMIT');
      console.log(`  ✓ ${arquivo}`);
    } catch (erro) {
      await cliente.query('ROLLBACK');
      throw erro;
    } finally {
      cliente.release();
    }
  }

  await semear();
  console.log(`\nBanco pronto: ${IDS_VAGAS.length} vagas cadastradas.`);
}

/**
 * As 16 vagas são catálogo, não dado de operação: nascem OFFLINE e só saem
 * desse estado quando um sensor (ou o simulador) afirmar algo.
 */
async function semear(): Promise<void> {
  const pool = obterPool();
  for (const id of IDS_VAGAS) {
    const { fileira, posicao } = decomporVagaId(id);
    await pool.query(
      `INSERT INTO vagas (id, fileira, posicao, tipo, estado, controlador_id)
       VALUES ($1, $2, $3, $4, 'OFFLINE', $5)
       ON CONFLICT (id) DO UPDATE SET fileira = EXCLUDED.fileira,
                                      posicao = EXCLUDED.posicao,
                                      tipo    = EXCLUDED.tipo`,
      [id, fileira, posicao, tipoDaVaga(id), config.controladorPadrao],
    );
  }

  await pool.query(
    `INSERT INTO controladores (id, online) VALUES ($1, false)
     ON CONFLICT (id) DO NOTHING`,
    [config.controladorPadrao],
  );
}

migrar()
  .then(() => encerrarPool())
  .catch(async (erro) => {
    console.error('\nFalha na migração:', erro instanceof Error ? erro.message : erro);
    console.error('O banco está no ar? `docker compose up -d postgres`');
    await encerrarPool();
    process.exit(1);
  });
