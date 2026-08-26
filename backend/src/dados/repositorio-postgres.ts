import { config } from '../config.js';
import type { Estado, TipoVaga, VagaId } from '../contrato/vagas.js';
import { encerrarPool, obterPool } from './postgres.js';
import type {
  FaixaOcupacao,
  RegistroControlador,
  RegistroEvento,
  RegistroVaga,
  Repositorio,
} from './repositorio.js';

export class RepositorioPostgres implements Repositorio {
  async iniciar(): Promise<void> {
    const { rows } = await obterPool().query<{ total: number }>(
      'SELECT count(*)::bigint AS total FROM vagas',
    );
    if (!rows[0] || rows[0].total === 0) {
      throw new Error('Tabela `vagas` vazia. Rode `npm run migrar` antes de subir o servidor.');
    }
  }

  async encerrar(): Promise<void> {
    await encerrarPool();
  }

  async listarVagas(): Promise<RegistroVaga[]> {
    const { rows } = await obterPool().query<{
      id: string;
      fileira: string;
      posicao: number;
      tipo: string;
      estado: string;
      atualizado_em: Date | null;
    }>(
      `SELECT id, fileira, posicao, tipo, estado, atualizado_em
         FROM vagas
        ORDER BY fileira, posicao`,
    );

    return rows.map((linha) => ({
      id: linha.id,
      fileira: linha.fileira.trim(),
      posicao: linha.posicao,
      tipo: linha.tipo as TipoVaga,
      estado: linha.estado as Estado,
      atualizadoEm: linha.atualizado_em,
    }));
  }

  async atualizarEstado(id: VagaId, estado: Estado, em: Date): Promise<void> {
    await obterPool().query('UPDATE vagas SET estado = $2, atualizado_em = $3 WHERE id = $1', [
      id,
      estado,
      em,
    ]);
  }

  /**
   * Gravação em lote: um único INSERT para a rajada acumulada. O caminho quente
   * (sensor → WebSocket) não espera por isto — ver `ServicoDeEstado`.
   */
  async registrarEventos(eventos: RegistroEvento[]): Promise<void> {
    if (eventos.length === 0) return;

    const valores: unknown[] = [];
    const marcadores = eventos.map((evento, i) => {
      valores.push(evento.vagaId, evento.estado, evento.ocorridoEm);
      return `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`;
    });

    await obterPool().query(
      `INSERT INTO eventos_ocupacao (vaga_id, estado, ocorrido_em) VALUES ${marcadores.join(', ')}`,
      valores,
    );
  }

  async historicoDaVaga(id: VagaId, limite: number): Promise<RegistroEvento[]> {
    const { rows } = await obterPool().query<{
      vaga_id: string;
      estado: string;
      ocorrido_em: Date;
    }>(
      `SELECT vaga_id, estado, ocorrido_em
         FROM eventos_ocupacao
        WHERE vaga_id = $1
        ORDER BY ocorrido_em DESC
        LIMIT $2`,
      [id, limite],
    );

    return rows.map((l) => ({ vagaId: l.vaga_id, estado: l.estado as Estado, ocorridoEm: l.ocorrido_em }));
  }

  async eventosDesde(desde: Date): Promise<RegistroEvento[]> {
    const { rows } = await obterPool().query<{
      vaga_id: string;
      estado: string;
      ocorrido_em: Date;
    }>(
      `SELECT vaga_id, estado, ocorrido_em
         FROM eventos_ocupacao
        WHERE ocorrido_em >= $1
        ORDER BY ocorrido_em ASC`,
      [desde],
    );

    return rows.map((l) => ({ vagaId: l.vaga_id, estado: l.estado as Estado, ocorridoEm: l.ocorrido_em }));
  }

  /**
   * Ocupação média por (dia da semana, hora), ponderada **pelo tempo** em cada
   * estado — não pela contagem de eventos.
   *
   * A diferença importa: uma vaga que ficou ocupada 3 horas gera 1 evento, e uma
   * vaga que oscilou 20 vezes em 5 minutos gera 20. Contar eventos diria que a
   * segunda é a mais ocupada; ponderar por tempo diz a verdade.
   *
   * Cada evento abre um intervalo que vale até o evento seguinte (ou até agora);
   * o intervalo é recortado nas fronteiras de hora e somado em cada balde.
   */
  async ocupacaoPorFaixaHoraria(id: VagaId | null, diasDeJanela: number): Promise<FaixaOcupacao[]> {
    const { rows } = await obterPool().query<{
      dia_semana: number;
      hora: number;
      taxa: number | null;
      segundos: number | null;
    }>(
      `WITH intervalos AS (
         SELECT vaga_id,
                estado,
                ocorrido_em AS inicio,
                LEAD(ocorrido_em) OVER (PARTITION BY vaga_id ORDER BY ocorrido_em) AS fim
           FROM eventos_ocupacao
          WHERE ocorrido_em >= now() - ($2::int * INTERVAL '1 day')
            AND ($1::text IS NULL OR vaga_id = $1::text)
            AND estado IN ('LIVRE', 'OCUPADA')
       ),
       recortado AS (
         SELECT i.estado,
                EXTRACT(DOW  FROM balde)::int AS dia_semana,
                EXTRACT(HOUR FROM balde)::int AS hora,
                EXTRACT(EPOCH FROM (
                  LEAST(COALESCE(i.fim, now()), balde + INTERVAL '1 hour')
                  - GREATEST(i.inicio, balde)
                )) AS segundos
           FROM intervalos i
           CROSS JOIN LATERAL generate_series(
                 date_trunc('hour', i.inicio),
                 date_trunc('hour', COALESCE(i.fim, now())),
                 INTERVAL '1 hour'
               ) AS balde
       )
       SELECT dia_semana,
              hora,
              COALESCE(SUM(segundos) FILTER (WHERE estado = 'OCUPADA'), 0)
                / NULLIF(SUM(segundos), 0) AS taxa,
              SUM(segundos) AS segundos
         FROM recortado
        WHERE segundos > 0
        GROUP BY dia_semana, hora
        ORDER BY dia_semana, hora`,
      [id, diasDeJanela],
    );

    return rows.map((l) => ({
      diaSemana: l.dia_semana,
      hora: l.hora,
      taxaOcupacao: l.taxa ?? 0,
      segundosObservados: Math.round(l.segundos ?? 0),
    }));
  }

  async salvarHeartbeat(registro: RegistroControlador): Promise<void> {
    await obterPool().query(
      `INSERT INTO controladores (id, online, ultimo_heartbeat, rssi)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET online = EXCLUDED.online,
                                      ultimo_heartbeat = EXCLUDED.ultimo_heartbeat,
                                      rssi = EXCLUDED.rssi`,
      [registro.id, registro.online, registro.ultimoHeartbeat, registro.rssi],
    );
  }

  async listarControladores(): Promise<RegistroControlador[]> {
    const { rows } = await obterPool().query<{
      id: string;
      online: boolean;
      ultimo_heartbeat: Date | null;
      rssi: number | null;
    }>('SELECT id, online, ultimo_heartbeat, rssi FROM controladores ORDER BY id');

    return rows.map((l) => ({
      id: l.id,
      online: l.online,
      ultimoHeartbeat: l.ultimo_heartbeat,
      rssi: l.rssi,
    }));
  }

  async vagasDoControlador(controladorId: string): Promise<VagaId[]> {
    const { rows } = await obterPool().query<{ id: string }>(
      'SELECT id FROM vagas WHERE controlador_id = $1 ORDER BY fileira, posicao',
      [controladorId],
    );
    return rows.map((l) => l.id);
  }
}

export const nomeDoBanco = (): string => {
  try {
    return new URL(config.databaseUrl).pathname.replace('/', '') || 'vagas';
  } catch {
    return 'vagas';
  }
};
