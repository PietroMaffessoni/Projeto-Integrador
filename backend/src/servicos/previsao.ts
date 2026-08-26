import type { VagaId } from '../contrato/vagas.js';
import type { FaixaOcupacao, Repositorio } from '../dados/repositorio.js';

/** Janela de histórico considerada. */
const DIAS_DE_JANELA = 28;

/**
 * Abaixo de meia hora de observação numa faixa, a taxa é ruído: 10 minutos em
 * que uma vaga por acaso estava ocupada virariam "100% ocupado às terças".
 */
const SEGUNDOS_MINIMOS_PARA_CONFIAR = 1_800;

export interface PrevisaoFaixa {
  diaSemana: number;
  hora: number;
  taxaOcupacao: number;
  /** `alta` | `media` | `baixa`, conforme o tempo observado. */
  confianca: 'alta' | 'media' | 'baixa';
  segundosObservados: number;
}

export interface Previsao {
  escopo: VagaId | 'ESTACIONAMENTO';
  janelaDias: number;
  faixas: PrevisaoFaixa[];
  /** Melhores horários para encontrar vaga hoje, do mais vazio ao mais cheio. */
  melhoresHorariosHoje: Array<{ hora: number; taxaOcupacao: number }>;
  agoraEsperado: { hora: number; taxaOcupacao: number; confianca: string } | null;
  amostragemSuficiente: boolean;
}

function classificarConfianca(segundos: number): PrevisaoFaixa['confianca'] {
  if (segundos >= SEGUNDOS_MINIMOS_PARA_CONFIAR * 4) return 'alta';
  if (segundos >= SEGUNDOS_MINIMOS_PARA_CONFIAR) return 'media';
  return 'baixa';
}

/**
 * Previsão de ocupação por faixa horária.
 *
 * O método é deliberadamente simples e explicável: média histórica ponderada
 * pelo tempo, agrupada por (dia da semana, hora). Não há modelo treinado nem
 * caixa-preta — com 28 dias de histórico de um estacionamento, a sazonalidade
 * semanal explica quase toda a variação, e qualquer coisa mais sofisticada
 * seria enfeite sem ganho de acerto.
 */
export async function preverOcupacao(
  repositorio: Repositorio,
  vagaId: VagaId | null,
  agora: Date = new Date(),
): Promise<Previsao> {
  const faixas = await repositorio.ocupacaoPorFaixaHoraria(vagaId, DIAS_DE_JANELA);

  const previstas: PrevisaoFaixa[] = faixas.map((faixa: FaixaOcupacao) => ({
    diaSemana: faixa.diaSemana,
    hora: faixa.hora,
    taxaOcupacao: Number(faixa.taxaOcupacao.toFixed(4)),
    confianca: classificarConfianca(faixa.segundosObservados),
    segundosObservados: faixa.segundosObservados,
  }));

  const hoje = agora.getDay();
  const doDia = previstas.filter((f) => f.diaSemana === hoje && f.confianca !== 'baixa');

  const melhoresHorariosHoje = [...doDia]
    .sort((a, b) => a.taxaOcupacao - b.taxaOcupacao)
    .slice(0, 3)
    .map((f) => ({ hora: f.hora, taxaOcupacao: f.taxaOcupacao }));

  const agoraFaixa = previstas.find((f) => f.diaSemana === hoje && f.hora === agora.getHours());

  return {
    escopo: vagaId ?? 'ESTACIONAMENTO',
    janelaDias: DIAS_DE_JANELA,
    faixas: previstas,
    melhoresHorariosHoje,
    agoraEsperado: agoraFaixa
      ? { hora: agoraFaixa.hora, taxaOcupacao: agoraFaixa.taxaOcupacao, confianca: agoraFaixa.confianca }
      : null,
    amostragemSuficiente: previstas.some((f) => f.confianca !== 'baixa'),
  };
}
