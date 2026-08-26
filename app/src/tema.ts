/**
 * Cores e medidas do app.
 *
 * ## Por que estes verdes e vermelhos, e não os óbvios
 *
 * Vermelho e verde é o pior par possível para daltonismo (CLAUDE.md, §10). O par
 * "natural" — verde #0ca30c e vermelho #d03b3b — foi medido e separa apenas
 * **ΔE 4,1** sob deuteranopia (OKLab ×100): praticamente a mesma cor para ~8%
 * dos homens.
 *
 * A convenção do semáforo é forte demais para ser jogada fora num aplicativo de
 * estacionamento, então mantivemos as duas famílias de cor e afastamos o par
 * **na luminosidade**: verde claro contra vermelho escuro. O mesmo teste dá
 * agora **ΔE 26,2** — mais de seis vezes a separação anterior, sem abrir mão de
 * "verde é livre".
 *
 * Ainda assim, cor nunca decide sozinha: cada vaga carrega textura (hachura para
 * ocupada, pontilhado para offline), rótulo com o identificador e ícone na
 * legenda. Quem não distingue as cores continua lendo o mapa.
 */

export type EsquemaCor = 'claro' | 'escuro';

interface Paleta {
  fundo: string;
  superficie: string;
  superficieElevada: string;
  borda: string;
  tintaPrimaria: string;
  tintaSecundaria: string;
  tintaSuave: string;

  livre: string;
  ocupada: string;
  offline: string;
  /** Tom da hachura sobre a vaga ocupada — mesma família, mais claro. */
  hachura: string;
  /** Pontilhado sobre a vaga sem informação. */
  pontilhado: string;

  tintaSobreLivre: string;
  tintaSobreOcupada: string;
  tintaSobreOffline: string;

  asfalto: string;
  calcada: string;
  faixa: string;
  destaque: string;

  atencao: string;
  critico: string;

  /** Rampa sequencial do mapa de calor, do menos ao mais ocupado. */
  rampaOcupacao: readonly string[];
}

const CLARO: Paleta = {
  fundo: '#f4f4f1',
  superficie: '#fcfcfb',
  superficieElevada: '#ffffff',
  borda: 'rgba(11,11,11,0.10)',
  tintaPrimaria: '#0b0b0b',
  tintaSecundaria: '#52514e',
  tintaSuave: '#898781',

  livre: '#4cc24c',
  ocupada: '#9c1c1c',
  offline: '#8b8b86',
  hachura: 'rgba(255,255,255,0.42)',
  pontilhado: 'rgba(255,255,255,0.55)',

  tintaSobreLivre: '#0b2d0b',
  tintaSobreOcupada: '#ffffff',
  tintaSobreOffline: '#ffffff',

  asfalto: '#e3e2dd',
  calcada: '#f0efec',
  faixa: '#ffffff',
  destaque: '#2a78d6',

  atencao: '#b26a00',
  critico: '#b3261e',

  rampaOcupacao: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'],
};

const ESCURO: Paleta = {
  fundo: '#0d0d0d',
  superficie: '#16181a',
  superficieElevada: '#1f2224',
  borda: 'rgba(255,255,255,0.12)',
  tintaPrimaria: '#ffffff',
  tintaSecundaria: '#c3c2b7',
  tintaSuave: '#898781',

  livre: '#63dd63',
  ocupada: '#b23a3a',
  offline: '#7a7a74',
  hachura: 'rgba(255,255,255,0.30)',
  pontilhado: 'rgba(255,255,255,0.45)',

  tintaSobreLivre: '#082408',
  tintaSobreOcupada: '#ffffff',
  tintaSobreOffline: '#0b0b0b',

  asfalto: '#26282a',
  calcada: '#1f2224',
  faixa: '#5c5f61',
  destaque: '#3987e5',

  atencao: '#fab219',
  critico: '#e66767',

  // Numa superfície escura, "quase zero" é o que se confunde com o fundo:
  // a rampa começa escura e clareia com a ocupação.
  rampaOcupacao: ['#0d366b', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4', '#cde2fb'],
};

export function paletaDe(esquema: EsquemaCor): Paleta {
  return esquema === 'escuro' ? ESCURO : CLARO;
}

export const espacamento = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const raio = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;

export const tipografia = {
  titulo: { fontSize: 20, fontWeight: '700' as const },
  subtitulo: { fontSize: 15, fontWeight: '600' as const },
  corpo: { fontSize: 14, fontWeight: '400' as const },
  legenda: { fontSize: 12, fontWeight: '500' as const },
  numeroHeroi: { fontSize: 44, fontWeight: '700' as const },
};

/** Cor de fundo e de texto de cada estado, num só lugar. */
export function coresDoEstado(
  paleta: Paleta,
  estado: 'LIVRE' | 'OCUPADA' | 'OFFLINE',
): { fundo: string; tinta: string } {
  switch (estado) {
    case 'LIVRE':
      return { fundo: paleta.livre, tinta: paleta.tintaSobreLivre };
    case 'OCUPADA':
      return { fundo: paleta.ocupada, tinta: paleta.tintaSobreOcupada };
    default:
      return { fundo: paleta.offline, tinta: paleta.tintaSobreOffline };
  }
}

/**
 * Ícone que acompanha cada estado. Existe para que a informação não dependa da
 * cor — na legenda, na lista e nas notificações.
 */
export const ICONE_ESTADO = {
  LIVRE: '○',
  OCUPADA: '✕',
  OFFLINE: '?',
} as const;

export const ROTULO_ESTADO = {
  LIVRE: 'Livre',
  OCUPADA: 'Ocupada',
  OFFLINE: 'Sem informação',
} as const;

export type Paleta_ = Paleta;
