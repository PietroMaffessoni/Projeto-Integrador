import type { FastifyInstance } from 'fastify';
import type { Aplicacao } from '../aplicacao.js';
import { normalizarVagaId } from '../contrato/vagas.js';
import { detectarAnomalias } from '../servicos/anomalias.js';
import { preverOcupacao } from '../servicos/previsao.js';

/** Rotas da Fase 4 — tudo aqui se sustenta na tabela `eventos_ocupacao`. */
export async function rotasDeAnalise(app: FastifyInstance, aplicacao: Aplicacao): Promise<void> {
  /** Previsão para o estacionamento inteiro. */
  app.get('/previsao', async () => preverOcupacao(aplicacao.repositorio, null));

  /** Previsão para uma vaga específica. */
  app.get<{ Params: { id: string } }>('/previsao/:id', async (requisicao, resposta) => {
    const id = normalizarVagaId(requisicao.params.id);
    if (!id) {
      return resposta.status(404).send({ erro: `Vaga "${requisicao.params.id}" não existe.` });
    }
    return preverOcupacao(aplicacao.repositorio, id);
  });

  app.get('/anomalias', async () => {
    const anomalias = await detectarAnomalias(aplicacao.estado, aplicacao.repositorio);
    const controladoresCaidos = aplicacao.monitor
      .situacao()
      .filter((c) => !c.online)
      .map((c) => ({
        tipo: 'CONTROLADOR_OFFLINE' as const,
        severidade: 'critico' as const,
        alvo: c.id,
        mensagem: c.ultimoHeartbeat
          ? `Controlador ${c.id} sem heartbeat há ${c.silencioSegundos}s.`
          : `Controlador ${c.id} nunca deu sinal de vida desde que o backend subiu.`,
        sugestao: 'Verificar alimentação da placa e conexão Wi-Fi com o broker.',
        detectadaEm: new Date().toISOString(),
      }));

    const todas = [...controladoresCaidos, ...anomalias];
    return {
      total: todas.length,
      criticas: todas.filter((a) => a.severidade === 'critico').length,
      anomalias: todas,
    };
  });
}
