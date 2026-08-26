import type { Estado, TipoVaga, VagaId } from '../contrato/vagas.js';

export interface RegistroVaga {
  id: VagaId;
  fileira: string;
  posicao: number;
  tipo: TipoVaga;
  estado: Estado;
  atualizadoEm: Date | null;
}

export interface RegistroEvento {
  vagaId: VagaId;
  estado: Estado;
  ocorridoEm: Date;
}

export interface FaixaOcupacao {
  diaSemana: number;
  hora: number;
  /** Fração do tempo da faixa em que havia carro, de 0 a 1. */
  taxaOcupacao: number;
  /** Segundos de observação que sustentam a taxa. Poucos = pouca confiança. */
  segundosObservados: number;
}

export interface RegistroControlador {
  id: string;
  online: boolean;
  ultimoHeartbeat: Date | null;
  rssi: number | null;
}

/**
 * A persistência é uma porta, não um detalhe espalhado pelo código: o serviço de
 * estado fala com esta interface e não sabe se atrás dela há PostgreSQL ou um
 * `Map`. É o que permite rodar a demonstração inteira sem banco.
 */
export interface Repositorio {
  iniciar(): Promise<void>;
  encerrar(): Promise<void>;

  listarVagas(): Promise<RegistroVaga[]>;
  atualizarEstado(id: VagaId, estado: Estado, em: Date): Promise<void>;
  registrarEventos(eventos: RegistroEvento[]): Promise<void>;

  historicoDaVaga(id: VagaId, limite: number): Promise<RegistroEvento[]>;
  eventosDesde(desde: Date): Promise<RegistroEvento[]>;
  ocupacaoPorFaixaHoraria(id: VagaId | null, diasDeJanela: number): Promise<FaixaOcupacao[]>;

  salvarHeartbeat(registro: RegistroControlador): Promise<void>;
  listarControladores(): Promise<RegistroControlador[]>;
  vagasDoControlador(controladorId: string): Promise<VagaId[]>;
}
