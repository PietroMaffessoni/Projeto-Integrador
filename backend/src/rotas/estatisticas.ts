import type { FastifyInstance } from 'fastify';
import type { Aplicacao } from '../aplicacao.js';
import { calcularEstatisticas } from '../servicos/estatisticas.js';

export async function rotasDeEstatisticas(app: FastifyInstance, aplicacao: Aplicacao): Promise<void> {
  app.get('/estatisticas', async () => calcularEstatisticas(aplicacao.estado.instantaneo()));
}
