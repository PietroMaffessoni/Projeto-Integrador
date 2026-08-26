import type { RegistroEvento, Repositorio } from '../dados/repositorio.js';
import { log } from '../log.js';

const INTERVALO_DESCARGA_MS = 200;
const TAMANHO_MAXIMO_LOTE = 500;

/**
 * Tira o banco do caminho crítico.
 *
 * O orçamento de latência (docs/orcamento-latencia.md) só fecha abaixo de 500 ms
 * porque a gravação do histórico acontece **depois** de o evento já ter sido
 * empurrado no WebSocket. Escrever 16 linhas soltas por segundo também é
 * desperdício: acumula-se por 200 ms e grava num INSERT só.
 */
export class FilaDePersistencia {
  private pendentes: RegistroEvento[] = [];
  private temporizador: NodeJS.Timeout | null = null;
  private descarregando = false;

  constructor(private readonly repositorio: Repositorio) {}

  enfileirar(evento: RegistroEvento): void {
    this.pendentes.push(evento);

    if (this.pendentes.length >= TAMANHO_MAXIMO_LOTE) {
      void this.descarregar();
      return;
    }

    this.temporizador ??= setTimeout(() => {
      this.temporizador = null;
      void this.descarregar();
    }, INTERVALO_DESCARGA_MS);
  }

  async descarregar(): Promise<void> {
    if (this.descarregando || this.pendentes.length === 0) return;

    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }

    const lote = this.pendentes;
    this.pendentes = [];
    this.descarregando = true;

    try {
      await this.repositorio.registrarEventos(lote);
    } catch (erro) {
      // Histórico é valioso, mas não a ponto de derrubar o tempo real: registra
      // a perda e segue. O estado ao vivo continua correto na tela.
      log.erro(
        'persistencia',
        `${lote.length} evento(s) perdido(s): ${erro instanceof Error ? erro.message : erro}`,
      );
    } finally {
      this.descarregando = false;
      if (this.pendentes.length > 0) void this.descarregar();
    }
  }

  get tamanhoPendente(): number {
    return this.pendentes.length;
  }
}
