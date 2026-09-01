import type { Vaga } from '../api/tipos';
import type { FiltroTipo } from '../estado/loja';

/** Escala da maquete: 1 mm no desenho equivale a 64 mm no mundo. */
const ESCALA = 64;

const MM = { calcada: 25, vagaLargura: 40, placaLargura: 345, meioCorredor: 47.5 } as const;

export interface Sugestao {
  vaga: Vaga;
  /** Distância aproximada até a entrada, em metros reais. */
  metros: number;
  /** Quantas outras vagas livres existem além desta. */
  outrasLivres: number;
}

/**
 * Melhor vaga livre agora: a mais próxima da entrada.
 *
 * A numeração cresce em direção à entrada, então a maior posição é a mais
 * perto — é literalmente o critério que qualquer motorista usa ao entrar num
 * estacionamento, e não exige modelo nenhum para acertar.
 *
 * Vagas reservadas (PCD, idoso) só são sugeridas quando o filtro correspondente
 * está ativo: sugerir uma vaga de PCD para quem não precisa dela seria induzir
 * a um uso indevido.
 */
export function melhorVaga(vagas: Vaga[], filtro: FiltroTipo): Sugestao | null {
  const candidatas = vagas.filter((vaga) => {
    if (vaga.estado !== 'LIVRE') return false;
    if (filtro !== 'TODAS') return vaga.tipo === filtro;
    return vaga.tipo === 'COMUM';
  });

  if (candidatas.length === 0) return null;

  const escolhida = [...candidatas].sort((a, b) => b.posicao - a.posicao)[0]!;

  return {
    vaga: escolhida,
    metros: distanciaAteAEntrada(escolhida),
    outrasLivres: candidatas.length - 1,
  };
}

function distanciaAteAEntrada(vaga: Vaga): number {
  const centroX = MM.calcada + (vaga.posicao - 1) * MM.vagaLargura + MM.vagaLargura / 2;
  const pelaVia = MM.placaLargura - centroX;
  const totalMm = (pelaVia + MM.meioCorredor) * ESCALA;
  return Math.round(totalMm / 1000);
}
