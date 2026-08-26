import type { FastifyInstance } from 'fastify';
import type { Aplicacao } from '../aplicacao.js';
import { normalizarVagaId } from '../contrato/vagas.js';

const LIMITE_HISTORICO_PADRAO = 100;
const LIMITE_HISTORICO_MAXIMO = 1000;

export async function rotasDeVagas(app: FastifyInstance, aplicacao: Aplicacao): Promise<void> {
  /**
   * Snapshot inicial. O app chama isto **uma vez** ao abrir e depois vive de
   * WebSocket (CLAUDE.md, seção 9) — nada de repetir esta chamada em intervalo.
   */
  app.get('/vagas', async () => {
    const vagas = aplicacao.estado.instantaneo();
    return { vagas, total: vagas.length, geradoEm: new Date().toISOString() };
  });

  app.get<{ Params: { id: string } }>('/vagas/:id', async (requisicao, resposta) => {
    const id = normalizarVagaId(requisicao.params.id);
    if (!id) {
      return resposta.status(404).send({ erro: `Vaga "${requisicao.params.id}" não existe.` });
    }

    const vaga = aplicacao.estado.obter(id);
    if (!vaga) return resposta.status(404).send({ erro: `Vaga "${id}" não existe.` });

    return vaga;
  });

  app.get<{ Params: { id: string }; Querystring: { limite?: string } }>(
    '/historico/:id',
    async (requisicao, resposta) => {
      const id = normalizarVagaId(requisicao.params.id);
      if (!id) {
        return resposta.status(404).send({ erro: `Vaga "${requisicao.params.id}" não existe.` });
      }

      const pedido = Number(requisicao.query.limite);
      const limite = Number.isFinite(pedido)
        ? Math.min(Math.max(1, Math.trunc(pedido)), LIMITE_HISTORICO_MAXIMO)
        : LIMITE_HISTORICO_PADRAO;

      const eventos = await aplicacao.repositorio.historicoDaVaga(id, limite);

      return {
        vaga: id,
        limite,
        eventos: eventos.map((evento) => ({
          estado: evento.estado,
          ocorridoEm: evento.ocorridoEm.toISOString(),
        })),
      };
    },
  );
}
