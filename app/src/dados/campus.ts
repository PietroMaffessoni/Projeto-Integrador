/**
 * Planta esquemática do campus de São Caetano do Sul.
 *
 * ⚠️ **A geometria aqui é esquemática, não topográfica.** Ela representa a
 * organização do campus — onde ficam os setores de estacionamento em relação aos
 * prédios e à portaria — e não as coordenadas reais de cada vaga. Substituir por
 * um levantamento oficial é trocar os números deste arquivo; nenhum componente
 * precisa mudar.
 *
 * Os números de capacidade partem do dado público do Instituto: **estacionamento
 * gratuito para 1.400 veículos**. A distribuição entre setores é uma estimativa
 * proporcional às áreas, e está marcada como tal na interface.
 *
 * O que **não** é estimativa: as 16 vagas do setor-piloto. Essas existem, estão
 * instrumentadas na maquete e aparecem aqui com o estado real, vindo do mesmo
 * backend que alimenta o mapa da maquete. É a demonstração de como o sistema
 * cresce do piloto para o campus inteiro sem mudar de arquitetura.
 */

export const CAPACIDADE_TOTAL_CAMPUS = 1400;

export type SituacaoZona = 'ao-vivo' | 'planejado';

export interface ZonaCampus {
  id: string;
  nome: string;
  /** Rótulo curto, desenhado dentro do polígono. */
  sigla: string;
  vagas: number;
  situacao: SituacaoZona;
  descricao: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface Edificacao {
  id: string;
  nome: string;
  sigla: string;
  tipo: 'academico' | 'esporte' | 'convivencia';
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/** Dimensões do desenho, em unidades arbitrárias do `viewBox`. */
export const PLANTA = { largura: 400, altura: 300 } as const;

export const VIAS = {
  vertical: { x: 186, y: 130, largura: 14, altura: 170 },
  horizontal: { x: 10, y: 130, largura: 380, altura: 14 },
  portaria: { x: 176, y: 286, largura: 34, altura: 14 },
} as const;

export const EDIFICACOES: readonly Edificacao[] = [
  {
    id: 'labs',
    nome: 'Blocos de laboratórios',
    sigla: 'LABS',
    tipo: 'academico',
    x: 96,
    y: 20,
    largura: 84,
    altura: 102,
  },
  {
    id: 'biblioteca',
    nome: 'Biblioteca Eng. Álvaro de Souza Lima',
    sigla: 'BIBLIOTECA',
    tipo: 'academico',
    x: 206,
    y: 20,
    largura: 90,
    altura: 52,
  },
  {
    id: 'convivencia',
    nome: 'Centro Acadêmico e cantina',
    sigla: 'CENTRO ACAD.',
    tipo: 'convivencia',
    x: 206,
    y: 80,
    largura: 90,
    altura: 42,
  },
  {
    id: 'ceaf',
    nome: 'CEAF — Centro de Esportes e Atividades Físicas',
    sigla: 'CEAF',
    tipo: 'esporte',
    x: 304,
    y: 20,
    largura: 86,
    altura: 102,
  },
];

export const ZONAS: readonly ZonaCampus[] = [
  {
    id: 'piloto',
    nome: 'Setor Piloto · junto à portaria',
    sigla: 'PILOTO',
    vagas: 16,
    situacao: 'ao-vivo',
    descricao:
      'As 16 vagas instrumentadas do projeto. É este setor que a maquete 1:64 reproduz, e o estado mostrado aqui vem dos sensores — ou do simulador, quando ele está no lugar deles.',
    x: 96,
    y: 152,
    largura: 84,
    altura: 34,
  },
  {
    id: 'A',
    nome: 'Setor A · Portaria',
    sigla: 'A',
    vagas: 210,
    situacao: 'planejado',
    descricao:
      'Primeiro setor a encher, por ser o mais próximo da entrada. Seria o próximo a receber sensores depois do piloto.',
    x: 96,
    y: 194,
    largura: 84,
    altura: 94,
  },
  {
    id: 'B',
    nome: 'Setor B · Visitantes',
    sigla: 'B',
    vagas: 280,
    situacao: 'planejado',
    descricao: 'Área central, entre a biblioteca e o Centro Acadêmico.',
    x: 206,
    y: 152,
    largura: 90,
    altura: 136,
  },
  {
    id: 'C',
    nome: 'Setor C · Laboratórios',
    sigla: 'C',
    vagas: 244,
    situacao: 'planejado',
    descricao: 'Faixa lateral que serve os blocos de laboratórios.',
    x: 10,
    y: 20,
    largura: 78,
    altura: 102,
  },
  {
    id: 'D',
    nome: 'Setor D · CEAF',
    sigla: 'D',
    vagas: 380,
    situacao: 'planejado',
    descricao:
      'Maior setor do campus, junto ao Centro de Esportes. Enche em horário de treino, não em horário de aula.',
    x: 304,
    y: 152,
    largura: 86,
    altura: 136,
  },
  {
    id: 'E',
    nome: 'Setor E · Convivência',
    sigla: 'E',
    vagas: 270,
    situacao: 'planejado',
    descricao: 'Setor de fundo, o último a encher em dia normal de aula.',
    x: 10,
    y: 152,
    largura: 78,
    altura: 136,
  },
];

export const ZONA_PILOTO = ZONAS[0]!;

/** Quantas vagas do campus já têm sensor. */
export function vagasInstrumentadas(): number {
  return ZONAS.filter((z) => z.situacao === 'ao-vivo').reduce((total, z) => total + z.vagas, 0);
}

export function cobertura(): number {
  return vagasInstrumentadas() / CAPACIDADE_TOTAL_CAMPUS;
}
