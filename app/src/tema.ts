import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Sistema visual do aplicativo.
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
 * Ainda assim, cor nunca decide sozinha: vaga ocupada mostra a silhueta de um
 * carro, vaga sem sinal fica pontilhada, e todas exibem o identificador.
 */

export type EsquemaCor = 'claro' | 'escuro';

export interface Paleta {
  fundo: string;
  fundoGradiente: readonly [string, string];
  superficie: string;
  superficieElevada: string;
  superficieSutil: string;
  borda: string;
  bordaForte: string;
  tintaPrimaria: string;
  tintaSecundaria: string;
  tintaSuave: string;

  livre: string;
  ocupada: string;
  offline: string;
  /** Tom do carro desenhado sobre a vaga ocupada. */
  carro: string;
  hachura: string;
  pontilhado: string;

  tintaSobreLivre: string;
  tintaSobreOcupada: string;
  tintaSobreOffline: string;

  asfalto: string;
  asfaltoEscuro: string;
  calcada: string;
  faixa: string;
  destaque: string;
  destaqueSuave: string;

  atencao: string;
  critico: string;

  /** Áreas do campus ainda sem sensores. */
  semSensor: string;
  semSensorTraco: string;

  rampaOcupacao: readonly string[];
}

const CLARO: Paleta = {
  fundo: '#f2f3f0',
  fundoGradiente: ['#f7f8f5', '#eceee9'],
  superficie: '#ffffff',
  superficieElevada: '#ffffff',
  superficieSutil: '#f6f7f4',
  borda: 'rgba(11,11,11,0.09)',
  bordaForte: 'rgba(11,11,11,0.18)',
  tintaPrimaria: '#101211',
  tintaSecundaria: '#4d514e',
  tintaSuave: '#868b87',

  livre: '#4cc24c',
  ocupada: '#9c1c1c',
  offline: '#8b8b86',
  carro: 'rgba(255,255,255,0.55)',
  hachura: 'rgba(255,255,255,0.16)',
  pontilhado: 'rgba(255,255,255,0.55)',

  tintaSobreLivre: '#0b2d0b',
  tintaSobreOcupada: '#ffffff',
  tintaSobreOffline: '#ffffff',

  asfalto: '#e2e3de',
  asfaltoEscuro: '#d3d5cf',
  calcada: '#eeefeb',
  faixa: '#ffffff',
  destaque: '#2a78d6',
  destaqueSuave: 'rgba(42,120,214,0.12)',

  atencao: '#b26a00',
  critico: '#b3261e',

  semSensor: '#d8dad4',
  semSensorTraco: 'rgba(11,11,11,0.28)',

  rampaOcupacao: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'],
};

const ESCURO: Paleta = {
  fundo: '#0e1011',
  fundoGradiente: ['#15181a', '#0c0e0f'],
  superficie: '#181b1d',
  superficieElevada: '#202426',
  superficieSutil: '#1e2224',
  borda: 'rgba(255,255,255,0.10)',
  bordaForte: 'rgba(255,255,255,0.22)',
  tintaPrimaria: '#f6f7f5',
  tintaSecundaria: '#c2c5c0',
  tintaSuave: '#878b87',

  livre: '#63dd63',
  ocupada: '#b23a3a',
  offline: '#7a7a74',
  carro: 'rgba(255,255,255,0.45)',
  hachura: 'rgba(255,255,255,0.14)',
  pontilhado: 'rgba(255,255,255,0.42)',

  tintaSobreLivre: '#082408',
  tintaSobreOcupada: '#ffffff',
  tintaSobreOffline: '#0e0e0e',

  asfalto: '#26292b',
  asfaltoEscuro: '#1c1f21',
  calcada: '#202426',
  faixa: '#5f6365',
  destaque: '#5aa0f0',
  destaqueSuave: 'rgba(90,160,240,0.16)',

  atencao: '#f0ad24',
  critico: '#e66767',

  semSensor: '#2b2f31',
  semSensorTraco: 'rgba(255,255,255,0.26)',

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
  xxl: 32,
} as const;

export const raio = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pilula: 999,
} as const;

export const tipografia = {
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.6 },
  titulo: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2 },
  subtitulo: { fontSize: 15, fontWeight: '600' as const },
  corpo: { fontSize: 14, fontWeight: '400' as const },
  legenda: { fontSize: 12, fontWeight: '500' as const },
  micro: { fontSize: 10.5, fontWeight: '600' as const, letterSpacing: 0.5 },
  numeroHeroi: { fontSize: 48, fontWeight: '800' as const, letterSpacing: -1.5 },
} satisfies Record<string, TextStyle>;

/** Elevação sutil — o suficiente para separar planos sem virar sombra de 2014. */
export function sombra(esquema: EsquemaCor, nivel: 1 | 2 = 1): ViewStyle {
  if (esquema === 'escuro') {
    // No escuro, sombra some. A separação vem da própria superfície mais clara.
    return {};
  }
  const config = nivel === 1
    ? { altura: 1, raio: 3, opacidade: 0.06, elevacao: 1 }
    : { altura: 6, raio: 16, opacidade: 0.1, elevacao: 4 };

  return Platform.select<ViewStyle>({
    android: { elevation: config.elevacao },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: config.altura },
      shadowOpacity: config.opacidade,
      shadowRadius: config.raio,
    },
  })!;
}

export const duracao = {
  rapida: 160,
  media: 280,
  destaque: 900,
} as const;

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

/** Símbolo textual de cada estado, para onde não cabe desenho. */
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

/** Mantido para compatibilidade com os componentes já escritos. */
export type Paleta_ = Paleta;
