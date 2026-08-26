/** Espelho, do lado do app, do contrato em docs/contrato-de-dados.md. */

export type Estado = 'LIVRE' | 'OCUPADA' | 'OFFLINE';
export type TipoVaga = 'COMUM' | 'PCD' | 'IDOSO';
export type Fileira = 'A' | 'B';

export interface Vaga {
  id: string;
  fileira: Fileira;
  posicao: number;
  tipo: TipoVaga;
  estado: Estado;
  atualizadoEm: string | null;
  haSegundos: number | null;
}

export interface RespostaVagas {
  vagas: Vaga[];
  total: number;
  geradoEm: string;
}

export interface MensagemMudanca {
  vaga: string;
  estado: Estado;
}

export interface ContagemPorEstado {
  LIVRE: number;
  OCUPADA: number;
  OFFLINE: number;
}

export interface Estatisticas {
  total: number;
  porEstado: ContagemPorEstado;
  porFileira: Array<{ fileira: Fileira; total: number } & ContagemPorEstado>;
  porTipo: Array<{ tipo: TipoVaga; total: number } & ContagemPorEstado>;
  taxaOcupacao: number;
  semInformacao: number;
  geradoEm: string;
}

export interface FaixaPrevisao {
  diaSemana: number;
  hora: number;
  taxaOcupacao: number;
  confianca: 'alta' | 'media' | 'baixa';
  segundosObservados: number;
}

export interface Previsao {
  escopo: string;
  janelaDias: number;
  faixas: FaixaPrevisao[];
  melhoresHorariosHoje: Array<{ hora: number; taxaOcupacao: number }>;
  agoraEsperado: { hora: number; taxaOcupacao: number; confianca: string } | null;
  amostragemSuficiente: boolean;
}

export interface Anomalia {
  tipo: 'SENSOR_OSCILANDO' | 'SENSOR_INERTE' | 'OCUPACAO_IMPLAUSIVEL' | 'CONTROLADOR_OFFLINE';
  severidade: 'aviso' | 'critico';
  alvo: string;
  mensagem: string;
  sugestao: string;
  detectadaEm: string;
}

export interface RespostaAnomalias {
  total: number;
  criticas: number;
  anomalias: Anomalia[];
}

export interface EventoHistorico {
  estado: Estado;
  ocorridoEm: string;
}

export interface RespostaHistorico {
  vaga: string;
  limite: number;
  eventos: EventoHistorico[];
}
