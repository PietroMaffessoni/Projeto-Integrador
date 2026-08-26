import cors from '@fastify/cors';
import Fastify from 'fastify';
import { montarAplicacao } from './aplicacao.js';
import { config } from './config.js';
import { log } from './log.js';
import { rotasDeAnalise } from './rotas/analise.js';
import { rotasDeDemo } from './rotas/demo.js';
import { rotasDeEstatisticas } from './rotas/estatisticas.js';
import { rotasDeSaude } from './rotas/saude.js';
import { rotasDeVagas } from './rotas/vagas.js';
import { iniciarTempoReal } from './tempo-real.js';

async function principal(): Promise<void> {
  const aplicacao = await montarAplicacao();

  const app = Fastify({ logger: false, trustProxy: true });
  await app.register(cors, { origin: true });

  await rotasDeVagas(app, aplicacao);
  await rotasDeEstatisticas(app, aplicacao);
  await rotasDeAnalise(app, aplicacao);
  await rotasDeSaude(app, aplicacao);
  if (config.permitirDemo) {
    await rotasDeDemo(app, aplicacao);
    log.aviso('servidor', 'rotas /demo habilitadas (PERMITIR_DEMO=true)');
  }

  app.setNotFoundHandler((requisicao, resposta) => {
    resposta.status(404).send({
      erro: `Rota ${requisicao.method} ${requisicao.url} não existe.`,
      disponiveis: ['/vagas', '/vagas/:id', '/estatisticas', '/historico/:id', '/previsao', '/anomalias', '/saude'],
    });
  });

  await app.listen({ port: config.porta, host: config.host });
  const tempoReal = iniciarTempoReal(app.server, aplicacao);

  log.info('servidor', `HTTP e WebSocket em http://${config.host}:${config.porta}`);
  log.info('servidor', `fonte=${aplicacao.fonte.nome}  persistencia=${config.persistencia}`);

  let encerrando = false;
  const encerrar = async (sinal: string): Promise<void> => {
    if (encerrando) return;
    encerrando = true;
    log.info('servidor', `${sinal} recebido — encerrando`);
    try {
      await tempoReal.encerrar();
      await app.close();
      // Depois do HTTP: garante que a última rajada de eventos chegue ao banco.
      await aplicacao.encerrar();
      log.info('servidor', 'encerrado com o histórico gravado');
      process.exit(0);
    } catch (erro) {
      log.erro('servidor', `falha ao encerrar: ${erro instanceof Error ? erro.message : erro}`);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void encerrar('SIGINT'));
  process.on('SIGTERM', () => void encerrar('SIGTERM'));
}

principal().catch((erro) => {
  log.erro('servidor', erro instanceof Error ? erro.message : String(erro));
  if (erro instanceof Error && /vazia|ECONNREFUSED|migrar/i.test(erro.message)) {
    log.erro('servidor', 'Banco indisponível ou não migrado. Alternativas:');
    log.erro('servidor', '  docker compose up -d postgres && npm run migrar');
    log.erro('servidor', '  ou rode sem banco: npm run dev:demo');
  }
  process.exit(1);
});
