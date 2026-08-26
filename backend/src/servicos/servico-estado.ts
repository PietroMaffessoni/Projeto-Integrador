import type { EventoOcupacao, MensagemMudanca, VagaAtual } from '../contrato/eventos.js';
import type { Estado, Fileira, TipoVaga, VagaId } from '../contrato/vagas.js';
import type { Repositorio } from '../dados/repositorio.js';
import { log } from '../log.js';
import { FilaDePersistencia } from './fila-persistencia.js';

interface EstadoInterno {
  id: VagaId;
  fileira: string;
  posicao: number;
  tipo: TipoVaga;
  estado: Estado;
  /** Quando o estado atual começou. */
  desde: Date | null;
  /** Último instante em que a vaga se manifestou, mesmo repetindo o estado. */
  vistaEm: Date | null;
}

export type OuvinteDeMudanca = (mensagem: MensagemMudanca) => void;

/**
 * A verdade corrente das 16 vagas, em memória.
 *
 * A tabela `vagas` é espelho, não fonte: consultá-la a cada mensagem MQTT
 * colocaria o banco no caminho crítico de um evento que precisa chegar ao
 * celular em menos de 500 ms.
 */
export class ServicoDeEstado {
  private readonly vagas = new Map<VagaId, EstadoInterno>();
  private readonly fila: FilaDePersistencia;
  private readonly ouvintes = new Set<OuvinteDeMudanca>();

  constructor(private readonly repositorio: Repositorio) {
    this.fila = new FilaDePersistencia(repositorio);
  }

  /** Carrega o catálogo e o último estado conhecido do banco. */
  async carregar(): Promise<void> {
    const registros = await this.repositorio.listarVagas();
    for (const registro of registros) {
      this.vagas.set(registro.id, {
        id: registro.id,
        fileira: registro.fileira,
        posicao: registro.posicao,
        tipo: registro.tipo,
        // Estado lido do banco é passado, não presente: até o controlador dar
        // sinal de vida, a única resposta honesta é OFFLINE (CLAUDE.md, §10).
        estado: 'OFFLINE',
        desde: registro.atualizadoEm,
        vistaEm: null,
      });
    }
    log.info('estado', `${this.vagas.size} vagas carregadas — todas OFFLINE até o primeiro sinal`);
  }

  aoMudar(ouvinte: OuvinteDeMudanca): () => void {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  /**
   * Aplica um evento de ocupação, venha de onde vier.
   *
   * Ordem deliberada: notifica primeiro, grava depois. Quem está olhando a tela
   * não deve esperar o disco.
   */
  aplicarOcupacao(evento: EventoOcupacao): void {
    const vaga = this.vagas.get(evento.vagaId);
    if (!vaga) {
      log.aviso('estado', `evento para vaga desconhecida "${evento.vagaId}" — descartado`);
      return;
    }

    vaga.vistaEm = evento.ocorridoEm;

    // Mensagens retained repetem o estado a cada reconexão do backend. Repetição
    // não é mudança: não vira linha no histórico nem tráfego no WebSocket.
    if (vaga.estado === evento.estado) return;

    const anterior = vaga.estado;
    vaga.estado = evento.estado;
    vaga.desde = evento.ocorridoEm;

    this.notificar({ vaga: vaga.id, estado: vaga.estado });

    this.fila.enfileirar({
      vagaId: vaga.id,
      estado: evento.estado,
      ocorridoEm: evento.ocorridoEm,
    });

    void this.repositorio
      .atualizarEstado(vaga.id, evento.estado, evento.ocorridoEm)
      .catch((erro) => log.erro('estado', `falha ao espelhar ${vaga.id}: ${erro.message}`));

    log.debug('estado', `${vaga.id}: ${anterior} → ${evento.estado} (${evento.origem})`);
  }

  /**
   * Marca vagas como OFFLINE — usado quando o controlador some.
   * A transição vai para o histórico: saber *quando* o sistema perdeu contato
   * é o que permite descontar esse tempo das estatísticas depois.
   */
  marcarOffline(ids: readonly VagaId[], em: Date = new Date()): number {
    let mudadas = 0;

    for (const id of ids) {
      const vaga = this.vagas.get(id);
      if (!vaga || vaga.estado === 'OFFLINE') continue;

      vaga.estado = 'OFFLINE';
      vaga.desde = em;
      mudadas += 1;

      this.notificar({ vaga: id, estado: 'OFFLINE' });
      this.fila.enfileirar({ vagaId: id, estado: 'OFFLINE', ocorridoEm: em });
      void this.repositorio
        .atualizarEstado(id, 'OFFLINE', em)
        .catch((erro) => log.erro('estado', `falha ao espelhar ${id}: ${erro.message}`));
    }

    return mudadas;
  }

  private notificar(mensagem: MensagemMudanca): void {
    for (const ouvinte of this.ouvintes) {
      try {
        ouvinte(mensagem);
      } catch (erro) {
        log.erro('estado', `ouvinte falhou: ${erro instanceof Error ? erro.message : erro}`);
      }
    }
  }

  /** Snapshot completo — o que o app busca uma única vez, ao abrir. */
  instantaneo(agora: Date = new Date()): VagaAtual[] {
    return [...this.vagas.values()]
      .sort((a, b) => a.fileira.localeCompare(b.fileira) || a.posicao - b.posicao)
      .map((vaga) => this.paraVagaAtual(vaga, agora));
  }

  obter(id: VagaId, agora: Date = new Date()): VagaAtual | null {
    const vaga = this.vagas.get(id);
    return vaga ? this.paraVagaAtual(vaga, agora) : null;
  }

  /** Instante da última manifestação de cada vaga — insumo do detector de sensor mudo. */
  ultimasLeituras(): Map<VagaId, Date | null> {
    return new Map([...this.vagas.values()].map((v) => [v.id, v.vistaEm]));
  }

  private paraVagaAtual(vaga: EstadoInterno, agora: Date): VagaAtual {
    return {
      id: vaga.id,
      fileira: vaga.fileira as Fileira,
      posicao: vaga.posicao,
      tipo: vaga.tipo,
      estado: vaga.estado,
      atualizadoEm: vaga.desde ? vaga.desde.toISOString() : null,
      haSegundos: vaga.desde ? Math.max(0, Math.round((agora.getTime() - vaga.desde.getTime()) / 1000)) : null,
    };
  }

  async encerrar(): Promise<void> {
    await this.fila.descarregar();
  }
}
