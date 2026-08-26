import { config, validarConfig } from './config.js';
import type { EventoOcupacao } from './contrato/eventos.js';
import { RepositorioMemoria } from './dados/repositorio-memoria.js';
import { RepositorioPostgres } from './dados/repositorio-postgres.js';
import type { Repositorio } from './dados/repositorio.js';
import { criarFonteDeEventos } from './fontes/index.js';
import type { FonteDeEventos } from './fontes/fonte.js';
import { log } from './log.js';
import { MonitorDeHeartbeat } from './servicos/monitor-heartbeat.js';
import { ServicoDeEstado } from './servicos/servico-estado.js';

export interface Aplicacao {
  repositorio: Repositorio;
  estado: ServicoDeEstado;
  monitor: MonitorDeHeartbeat;
  fonte: FonteDeEventos;
  /** Injeta um evento como se tivesse vindo da fonte — só para as rotas /demo. */
  injetar(evento: EventoOcupacao): void;
  encerrar(): Promise<void>;
}

/**
 * Monta o sistema e liga as peças. Todo o resto do código recebe o que precisa
 * por parâmetro — nada importa singleton, o que mantém os testes possíveis.
 */
export async function montarAplicacao(): Promise<Aplicacao> {
  validarConfig();

  const repositorio: Repositorio =
    config.persistencia === 'memoria' ? new RepositorioMemoria() : new RepositorioPostgres();
  await repositorio.iniciar();
  log.info('aplicacao', `persistência: ${config.persistencia}`);

  const estado = new ServicoDeEstado(repositorio);
  await estado.carregar();

  const monitor = new MonitorDeHeartbeat(estado, repositorio);
  await monitor.iniciar();

  const fonte = criarFonteDeEventos();
  await fonte.iniciar({
    ocupacao: (evento) => estado.aplicarOcupacao(evento),
    heartbeat: (evento) => monitor.registrar(evento),
  });
  log.info('aplicacao', `fonte de eventos: ${fonte.descricao}`);

  return {
    repositorio,
    estado,
    monitor,
    fonte,
    injetar: (evento) => estado.aplicarOcupacao(evento),
    async encerrar() {
      monitor.parar();
      await fonte.parar();
      await estado.encerrar();
      await repositorio.encerrar();
    },
  };
}
