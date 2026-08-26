import type { Server as ServidorHttp } from 'node:http';
import { Server as ServidorSocket } from 'socket.io';
import type { Aplicacao } from './aplicacao.js';
import { EVENTO_WS_ALERTA, EVENTO_WS_MUDANCA } from './contrato/eventos.js';
import { log } from './log.js';
import { detectarAnomalias } from './servicos/anomalias.js';

/** De quanto em quanto tempo o backend reavalia as anomalias e avisa o app. */
const INTERVALO_ANOMALIAS_MS = 60_000;

export interface TempoReal {
  io: ServidorSocket;
  clientesConectados(): number;
  encerrar(): Promise<void>;
}

/**
 * Empurra as mudanças para os apps conectados.
 *
 * O servidor emite **apenas o delta** — `{ vaga, estado }`. O estado completo o
 * app já pegou uma vez no `GET /vagas` (CLAUDE.md, seção 9): mandar as 16 vagas
 * a cada carro que estaciona seria gastar rádio do celular à toa.
 */
export function iniciarTempoReal(servidor: ServidorHttp, aplicacao: Aplicacao): TempoReal {
  const io = new ServidorSocket(servidor, {
    // A rede é local e fechada (roteador próprio para a demonstração); o app
    // roda no Expo e não tem origem fixa.
    cors: { origin: '*' },
    // Perder o app por 20 s de Wi-Fi instável é pior do que segurar a conexão.
    pingInterval: 10_000,
    pingTimeout: 20_000,
  });

  io.on('connection', (socket) => {
    log.info('websocket', `app conectado (${socket.id}) — ${io.engine.clientsCount} online`);
    socket.on('disconnect', (motivo) => {
      log.info('websocket', `app saiu (${socket.id}): ${motivo}`);
    });
  });

  const desinscrever = aplicacao.estado.aoMudar((mensagem) => {
    io.emit(EVENTO_WS_MUDANCA, mensagem);
  });

  // Anomalias não são evento de tempo real: são conclusão sobre o histórico.
  // Reavaliar de minuto em minuto é frequente o bastante para a apresentação e
  // barato o bastante para não competir com o caminho quente.
  let assinaturaAnterior = '';
  const verificador = setInterval(() => {
    void (async () => {
      try {
        const anomalias = await detectarAnomalias(aplicacao.estado, aplicacao.repositorio);
        const assinatura = anomalias.map((a) => `${a.tipo}:${a.alvo}`).sort().join('|');
        if (assinatura === assinaturaAnterior) return;

        assinaturaAnterior = assinatura;
        io.emit(EVENTO_WS_ALERTA, { total: anomalias.length, anomalias });
        if (anomalias.length > 0) {
          log.aviso('anomalias', `${anomalias.length} anomalia(s) ativa(s)`);
        }
      } catch (erro) {
        log.erro('anomalias', erro instanceof Error ? erro.message : String(erro));
      }
    })();
  }, INTERVALO_ANOMALIAS_MS);

  return {
    io,
    clientesConectados: () => io.engine.clientsCount,
    async encerrar() {
      clearInterval(verificador);
      desinscrever();
      await io.close();
    },
  };
}
