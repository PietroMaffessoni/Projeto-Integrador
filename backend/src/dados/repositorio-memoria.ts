import { config } from '../config.js';
import { IDS_VAGAS, decomporVagaId, tipoDaVaga } from '../contrato/vagas.js';
import type { Estado, VagaId } from '../contrato/vagas.js';
import type {
  FaixaOcupacao,
  RegistroControlador,
  RegistroEvento,
  RegistroVaga,
  Repositorio,
} from './repositorio.js';

/** Teto de eventos guardados em RAM (~2 dias de maquete movimentada). */
const LIMITE_EVENTOS = 50_000;

/**
 * Persistência em memória, usada quando `PERSISTENCIA=memoria`.
 *
 * Existe por um motivo prático de defesa: o sistema inteiro precisa subir na
 * máquina de quem for avaliar, sem Docker, sem banco e sem broker. Perde-se o
 * histórico ao reiniciar — e só isso.
 */
export class RepositorioMemoria implements Repositorio {
  private readonly vagas = new Map<VagaId, RegistroVaga>();
  private readonly eventos: RegistroEvento[] = [];
  private readonly controladores = new Map<string, RegistroControlador>();

  async iniciar(): Promise<void> {
    for (const id of IDS_VAGAS) {
      const { fileira, posicao } = decomporVagaId(id);
      this.vagas.set(id, {
        id,
        fileira,
        posicao,
        tipo: tipoDaVaga(id),
        estado: 'OFFLINE',
        atualizadoEm: null,
      });
    }
  }

  async encerrar(): Promise<void> {
    this.vagas.clear();
    this.eventos.length = 0;
  }

  async listarVagas(): Promise<RegistroVaga[]> {
    return [...this.vagas.values()]
      .sort((a, b) => a.fileira.localeCompare(b.fileira) || a.posicao - b.posicao)
      .map((v) => ({ ...v }));
  }

  async atualizarEstado(id: VagaId, estado: Estado, em: Date): Promise<void> {
    const vaga = this.vagas.get(id);
    if (vaga) {
      vaga.estado = estado;
      vaga.atualizadoEm = em;
    }
  }

  async registrarEventos(eventos: RegistroEvento[]): Promise<void> {
    this.eventos.push(...eventos.map((e) => ({ ...e })));
    if (this.eventos.length > LIMITE_EVENTOS) {
      this.eventos.splice(0, this.eventos.length - LIMITE_EVENTOS);
    }
  }

  async historicoDaVaga(id: VagaId, limite: number): Promise<RegistroEvento[]> {
    return this.eventos
      .filter((e) => e.vagaId === id)
      .slice(-limite)
      .reverse()
      .map((e) => ({ ...e }));
  }

  async eventosDesde(desde: Date): Promise<RegistroEvento[]> {
    return this.eventos
      .filter((e) => e.ocorridoEm >= desde)
      .map((e) => ({ ...e }))
      .sort((a, b) => a.ocorridoEm.getTime() - b.ocorridoEm.getTime());
  }

  /** Mesma regra da versão SQL: ponderação por tempo, recortada por hora. */
  async ocupacaoPorFaixaHoraria(id: VagaId | null, diasDeJanela: number): Promise<FaixaOcupacao[]> {
    const agora = Date.now();
    const inicioJanela = agora - diasDeJanela * 24 * 60 * 60 * 1000;

    const relevantes = this.eventos
      .filter((e) => (id === null || e.vagaId === id) && e.estado !== 'OFFLINE')
      .sort((a, b) => a.ocorridoEm.getTime() - b.ocorridoEm.getTime());

    const porVaga = new Map<VagaId, RegistroEvento[]>();
    for (const evento of relevantes) {
      const lista = porVaga.get(evento.vagaId);
      if (lista) lista.push(evento);
      else porVaga.set(evento.vagaId, [evento]);
    }

    // chave "dia-hora" → { ocupado, total } em segundos
    const baldes = new Map<string, { ocupado: number; total: number }>();

    for (const lista of porVaga.values()) {
      for (let i = 0; i < lista.length; i += 1) {
        const atual = lista[i]!;
        const inicio = Math.max(atual.ocorridoEm.getTime(), inicioJanela);
        const fim = lista[i + 1] ? lista[i + 1]!.ocorridoEm.getTime() : agora;
        if (fim <= inicio) continue;

        let cursor = inicio;
        while (cursor < fim) {
          const balde = new Date(cursor);
          balde.setMinutes(0, 0, 0);
          const fimDoBalde = balde.getTime() + 60 * 60 * 1000;
          const pedaco = (Math.min(fim, fimDoBalde) - cursor) / 1000;

          const chave = `${balde.getDay()}-${balde.getHours()}`;
          const acumulado = baldes.get(chave) ?? { ocupado: 0, total: 0 };
          acumulado.total += pedaco;
          if (atual.estado === 'OCUPADA') acumulado.ocupado += pedaco;
          baldes.set(chave, acumulado);

          cursor = fimDoBalde;
        }
      }
    }

    return [...baldes.entries()]
      .map(([chave, { ocupado, total }]) => {
        const [dia, hora] = chave.split('-').map(Number);
        return {
          diaSemana: dia!,
          hora: hora!,
          taxaOcupacao: total > 0 ? ocupado / total : 0,
          segundosObservados: Math.round(total),
        };
      })
      .sort((a, b) => a.diaSemana - b.diaSemana || a.hora - b.hora);
  }

  async salvarHeartbeat(registro: RegistroControlador): Promise<void> {
    this.controladores.set(registro.id, { ...registro });
  }

  async listarControladores(): Promise<RegistroControlador[]> {
    return [...this.controladores.values()].map((c) => ({ ...c }));
  }

  async vagasDoControlador(controladorId: string): Promise<VagaId[]> {
    // Na maquete há uma única placa; todas as vagas pertencem a ela.
    return controladorId === config.controladorPadrao ? [...IDS_VAGAS] : [];
  }
}
