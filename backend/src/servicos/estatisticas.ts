import type { VagaAtual } from '../contrato/eventos.js';
import { FILEIRAS, TIPOS_VAGA } from '../contrato/vagas.js';
import type { Estado, Fileira, TipoVaga } from '../contrato/vagas.js';

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
  /** Fração de ocupação entre as vagas de que temos notícia (exclui OFFLINE). */
  taxaOcupacao: number;
  /** Quantas vagas o sistema admite não conhecer. */
  semInformacao: number;
  geradoEm: string;
}

function contar(vagas: readonly VagaAtual[]): ContagemPorEstado {
  const contagem: ContagemPorEstado = { LIVRE: 0, OCUPADA: 0, OFFLINE: 0 };
  for (const vaga of vagas) contagem[vaga.estado as Estado] += 1;
  return contagem;
}

/**
 * A taxa de ocupação ignora as vagas OFFLINE em vez de contá-las como livres.
 * Dizer "50% ocupado" quando metade dos sensores está muda seria inventar.
 */
export function calcularEstatisticas(vagas: readonly VagaAtual[]): Estatisticas {
  const porEstado = contar(vagas);
  const conhecidas = porEstado.LIVRE + porEstado.OCUPADA;

  return {
    total: vagas.length,
    porEstado,
    porFileira: FILEIRAS.map((fileira) => {
      const daFileira = vagas.filter((v) => v.fileira === fileira);
      return { fileira, total: daFileira.length, ...contar(daFileira) };
    }),
    porTipo: TIPOS_VAGA.map((tipo) => {
      const doTipo = vagas.filter((v) => v.tipo === tipo);
      return { tipo, total: doTipo.length, ...contar(doTipo) };
    }),
    taxaOcupacao: conhecidas > 0 ? porEstado.OCUPADA / conhecidas : 0,
    semInformacao: porEstado.OFFLINE,
    geradoEm: new Date().toISOString(),
  };
}
