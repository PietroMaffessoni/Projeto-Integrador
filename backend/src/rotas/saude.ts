import type { FastifyInstance } from 'fastify';
import type { Aplicacao } from '../aplicacao.js';
import { config } from '../config.js';
import { calcularEstatisticas } from '../servicos/estatisticas.js';

const inicio = Date.now();

/**
 * Diagnóstico honesto do sistema: qual fonte está ativa, se ela está saudável e
 * quantas vagas o backend admite não conhecer. É a primeira tela a olhar quando
 * algo dá errado no dia da apresentação.
 */
export async function rotasDeSaude(app: FastifyInstance, aplicacao: Aplicacao): Promise<void> {
  app.get('/saude', async () => {
    const estatisticas = calcularEstatisticas(aplicacao.estado.instantaneo());
    const fonteSaudavel = aplicacao.fonte.estaSaudavel();
    const controladores = aplicacao.monitor.situacao();

    return {
      status: fonteSaudavel ? 'ok' : 'degradado',
      uptimeSegundos: Math.round((Date.now() - inicio) / 1000),
      fonte: {
        nome: aplicacao.fonte.nome,
        descricao: aplicacao.fonte.descricao,
        saudavel: fonteSaudavel,
      },
      persistencia: config.persistencia,
      controladores: controladores.map((c) => ({
        id: c.id,
        online: c.online,
        silencioSegundos: c.silencioSegundos,
        rssi: c.rssi,
      })),
      vagas: {
        total: estatisticas.total,
        livres: estatisticas.porEstado.LIVRE,
        ocupadas: estatisticas.porEstado.OCUPADA,
        semInformacao: estatisticas.porEstado.OFFLINE,
      },
    };
  });
}
