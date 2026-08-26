import type { FastifyInstance } from 'fastify';
import type { Aplicacao } from '../aplicacao.js';
import { ESTADOS_MEDIDOS, IDS_VAGAS, normalizarVagaId } from '../contrato/vagas.js';
import type { EstadoMedido } from '../contrato/vagas.js';

/**
 * Rotas de demonstração, ligadas só com `PERMITIR_DEMO=true`.
 *
 * Servem para forçar um estado sem carrinho e sem broker — útil para gravar
 * vídeo da defesa e para testar o app em sala. Um evento injetado aqui percorre
 * exatamente o mesmo caminho de um evento vindo do sensor: mesma fila, mesmo
 * WebSocket, mesmo histórico.
 */
export async function rotasDeDemo(app: FastifyInstance, aplicacao: Aplicacao): Promise<void> {
  app.post<{ Params: { id: string }; Body: { estado?: string } }>(
    '/demo/vaga/:id',
    async (requisicao, resposta) => {
      const id = normalizarVagaId(requisicao.params.id);
      if (!id) {
        return resposta.status(404).send({ erro: `Vaga "${requisicao.params.id}" não existe.` });
      }

      const estado = requisicao.body?.estado?.toUpperCase();
      if (!estado || !ESTADOS_MEDIDOS.includes(estado as EstadoMedido)) {
        return resposta
          .status(400)
          .send({ erro: `Estado inválido. Use ${ESTADOS_MEDIDOS.join(' ou ')}.` });
      }

      aplicacao.injetar({
        vagaId: id,
        estado: estado as EstadoMedido,
        ocorridoEm: new Date(),
        origem: 'demo',
      });

      return { vaga: id, estado, origem: 'demo' };
    },
  );

  /** Sorteia um novo estado para as 16 vagas de uma vez. */
  app.post('/demo/embaralhar', async () => {
    const agora = new Date();
    for (const vagaId of IDS_VAGAS) {
      aplicacao.injetar({
        vagaId,
        estado: Math.random() < 0.5 ? 'OCUPADA' : 'LIVRE',
        ocorridoEm: agora,
        origem: 'demo',
      });
    }
    return { embaralhadas: IDS_VAGAS.length };
  });
}
