/**
 * Gera 28 dias de histórico sintético para as 16 vagas.
 *
 *   npm run semear-historico
 *
 * A previsão e o mapa de calor da Fase 4 precisam de semanas de dados para
 * significar alguma coisa — e ninguém vai deixar a maquete ligada um mês antes
 * da defesa. Este script preenche `eventos_ocupacao` com um padrão plausível de
 * estacionamento de faculdade: cheio nos horários de aula, vazio de madrugada e
 * calmo nos fins de semana.
 *
 * O que ele produz é declaradamente sintético e serve para demonstrar o
 * mecanismo de análise, não para afirmar nada sobre o estacionamento real.
 */

import { config, validarConfig } from '../config.js';
import { IDS_VAGAS } from '../contrato/vagas.js';
import type { VagaId } from '../contrato/vagas.js';
import { encerrarPool } from './postgres.js';
import { RepositorioPostgres } from './repositorio-postgres.js';
import type { RegistroEvento } from './repositorio.js';

const DIAS = 28;

/** Probabilidade de a vaga estar ocupada, por hora do dia, em dia útil. */
const PERFIL_DIA_UTIL = [
  0.05, 0.03, 0.02, 0.02, 0.02, 0.05, 0.15, 0.45, // 0h–7h
  0.80, 0.90, 0.92, 0.88, 0.70, 0.75, 0.90, 0.92, // 8h–15h
  0.85, 0.70, 0.55, 0.40, 0.25, 0.15, 0.10, 0.07, // 16h–23h
];

/** No fim de semana o campus só tem laboratório aberto de manhã. */
const PERFIL_FIM_DE_SEMANA = [
  0.02, 0.02, 0.01, 0.01, 0.01, 0.02, 0.04, 0.08,
  0.20, 0.30, 0.35, 0.30, 0.20, 0.15, 0.12, 0.10,
  0.08, 0.06, 0.05, 0.05, 0.04, 0.03, 0.03, 0.02,
];

/**
 * Vagas perto da entrada enchem primeiro — a numeração cresce em direção a ela,
 * então A8/B8 disputam mais do que A1/B1.
 */
function atratividade(vagaId: VagaId): number {
  const posicao = Number(vagaId.slice(1));
  return 0.75 + (posicao / 8) * 0.45;
}

function probabilidadeOcupacao(vagaId: VagaId, momento: Date): number {
  const fimDeSemana = momento.getDay() === 0 || momento.getDay() === 6;
  const perfil = fimDeSemana ? PERFIL_FIM_DE_SEMANA : PERFIL_DIA_UTIL;
  const base = perfil[momento.getHours()] ?? 0.1;
  return Math.min(0.98, base * atratividade(vagaId));
}

function gerarEventos(): RegistroEvento[] {
  const eventos: RegistroEvento[] = [];
  const agora = new Date();
  const inicio = new Date(agora.getTime() - DIAS * 24 * 3600 * 1000);
  inicio.setMinutes(0, 0, 0);

  for (const vagaId of IDS_VAGAS) {
    let estado: 'LIVRE' | 'OCUPADA' = 'LIVRE';
    eventos.push({ vagaId, estado, ocorridoEm: new Date(inicio) });

    // Amostra a cada 20 minutos; só as transições viram evento, exatamente como
    // o firmware faria.
    for (let t = inicio.getTime(); t < agora.getTime(); t += 20 * 60 * 1000) {
      const momento = new Date(t);
      const p = probabilidadeOcupacao(vagaId, momento);
      const desejado: 'LIVRE' | 'OCUPADA' = Math.random() < p ? 'OCUPADA' : 'LIVRE';

      if (desejado === estado) continue;

      // Espalha o instante dentro da janela para os eventos não caírem todos
      // no mesmo minuto redondo.
      const jitter = Math.floor(Math.random() * 20 * 60 * 1000);
      eventos.push({ vagaId, estado: desejado, ocorridoEm: new Date(t + jitter) });
      estado = desejado;
    }
  }

  return eventos.sort((a, b) => a.ocorridoEm.getTime() - b.ocorridoEm.getTime());
}

async function semear(): Promise<void> {
  validarConfig();

  if (config.persistencia !== 'postgres') {
    console.error('PERSISTENCIA=memoria não guarda histórico entre execuções.');
    console.error('Ajuste o .env para postgres antes de semear.');
    process.exit(1);
  }

  const repositorio = new RepositorioPostgres();
  await repositorio.iniciar();

  const eventos = gerarEventos();
  console.log(`Gerando ${eventos.length} eventos ao longo de ${DIAS} dias…`);

  const TAMANHO_LOTE = 500;
  for (let i = 0; i < eventos.length; i += TAMANHO_LOTE) {
    await repositorio.registrarEventos(eventos.slice(i, i + TAMANHO_LOTE));
  }

  console.log(`Pronto. Consulte GET /previsao para ver o padrão semanal emergir.`);
}

semear()
  .then(() => encerrarPool())
  .catch(async (erro) => {
    console.error('Falha ao semear:', erro instanceof Error ? erro.message : erro);
    await encerrarPool();
    process.exit(1);
  });
