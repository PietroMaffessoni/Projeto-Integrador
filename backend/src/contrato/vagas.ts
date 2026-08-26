/**
 * Vocabulário do domínio — o mesmo identificador do firmware até o mapa do app,
 * sem tradução em nenhuma camada intermediária (CLAUDE.md, seção 4).
 */

export const FILEIRAS = ['A', 'B'] as const;
export type Fileira = (typeof FILEIRAS)[number];

export const VAGAS_POR_FILEIRA = 8;

/** `A1`..`A8`, `B1`..`B8` */
export type VagaId = string;

export const TIPOS_VAGA = ['COMUM', 'PCD', 'IDOSO'] as const;
export type TipoVaga = (typeof TIPOS_VAGA)[number];

/**
 * `OFFLINE` não é um estado do mundo físico: é a admissão de que não sabemos.
 * Vaga sem dado recente jamais é exibida como LIVRE (CLAUDE.md, seção 10).
 */
export const ESTADOS = ['LIVRE', 'OCUPADA', 'OFFLINE'] as const;
export type Estado = (typeof ESTADOS)[number];

/** Estados que um sensor é capaz de afirmar. `OFFLINE` só o backend atribui. */
export const ESTADOS_MEDIDOS = ['LIVRE', 'OCUPADA'] as const;
export type EstadoMedido = (typeof ESTADOS_MEDIDOS)[number];

/** As 16 vagas, na ordem em que existem na maquete. */
export const IDS_VAGAS: readonly VagaId[] = FILEIRAS.flatMap((fileira) =>
  Array.from({ length: VAGAS_POR_FILEIRA }, (_, i) => `${fileira}${i + 1}`),
);

const CONJUNTO_IDS = new Set(IDS_VAGAS);

export function ehVagaValida(id: string): boolean {
  return CONJUNTO_IDS.has(id.toUpperCase());
}

export function normalizarVagaId(id: string): VagaId | null {
  const candidato = id.trim().toUpperCase();
  return CONJUNTO_IDS.has(candidato) ? candidato : null;
}

export function decomporVagaId(id: VagaId): { fileira: Fileira; posicao: number } {
  const fileira = id[0] as Fileira;
  const posicao = Number(id.slice(1));
  return { fileira, posicao };
}

/**
 * Tipos de vaga da maquete. Escolhidos nas posições mais próximas da entrada,
 * como manda a norma de acessibilidade — e a numeração cresce em direção à
 * entrada, então as maiores posições são as mais próximas dela.
 */
export const TIPO_POR_VAGA: Readonly<Record<VagaId, TipoVaga>> = {
  A8: 'PCD',
  A7: 'IDOSO',
  B8: 'PCD',
  B7: 'IDOSO',
};

export function tipoDaVaga(id: VagaId): TipoVaga {
  return TIPO_POR_VAGA[id] ?? 'COMUM';
}
