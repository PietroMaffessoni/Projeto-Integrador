import { config } from '../config';
import type {
  Estatisticas,
  Previsao,
  RespostaAnomalias,
  RespostaHistorico,
  RespostaVagas,
} from './tipos';

async function buscar<T>(caminho: string): Promise<T> {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), config.timeoutRequisicaoMs);

  try {
    const resposta = await fetch(`${config.urlApi}${caminho}`, { signal: controlador.signal });
    if (!resposta.ok) {
      throw new Error(`${resposta.status} em ${caminho}`);
    }
    return (await resposta.json()) as T;
  } catch (erro) {
    if (erro instanceof Error && erro.name === 'AbortError') {
      throw new Error(`Sem resposta de ${config.urlApi} — o backend está no ar?`);
    }
    throw erro;
  } finally {
    clearTimeout(limite);
  }
}

/**
 * Snapshot completo. Chamado **uma vez** ao abrir e a cada reconexão do
 * WebSocket — nunca em intervalo (CLAUDE.md, seção 9).
 */
export const buscarVagas = (): Promise<RespostaVagas> => buscar<RespostaVagas>('/vagas');

export const buscarEstatisticas = (): Promise<Estatisticas> => buscar<Estatisticas>('/estatisticas');

export const buscarPrevisao = (vaga?: string): Promise<Previsao> =>
  buscar<Previsao>(vaga ? `/previsao/${vaga}` : '/previsao');

export const buscarAnomalias = (): Promise<RespostaAnomalias> =>
  buscar<RespostaAnomalias>('/anomalias');

export const buscarHistorico = (vaga: string, limite = 20): Promise<RespostaHistorico> =>
  buscar<RespostaHistorico>(`/historico/${vaga}?limite=${limite}`);
