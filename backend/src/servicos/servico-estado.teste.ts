import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { MensagemMudanca } from '../contrato/eventos.js';
import { RepositorioMemoria } from '../dados/repositorio-memoria.js';
import { ServicoDeEstado } from './servico-estado.js';

describe('ServicoDeEstado', () => {
  let repositorio: RepositorioMemoria;
  let estado: ServicoDeEstado;
  let recebidas: MensagemMudanca[];

  beforeEach(async () => {
    repositorio = new RepositorioMemoria();
    await repositorio.iniciar();
    estado = new ServicoDeEstado(repositorio);
    await estado.carregar();
    recebidas = [];
    estado.aoMudar((mensagem) => recebidas.push(mensagem));
  });

  it('nasce com as 16 vagas OFFLINE, nunca LIVRE', () => {
    const vagas = estado.instantaneo();
    assert.equal(vagas.length, 16);
    assert.ok(vagas.every((v) => v.estado === 'OFFLINE'));
  });

  it('notifica a mudança de estado', () => {
    estado.aplicarOcupacao({
      vagaId: 'A3',
      estado: 'OCUPADA',
      ocorridoEm: new Date(),
      origem: 'simulador',
    });

    assert.deepEqual(recebidas, [{ vaga: 'A3', estado: 'OCUPADA' }]);
    assert.equal(estado.obter('A3')?.estado, 'OCUPADA');
  });

  it('ignora repetição do mesmo estado (mensagens retained na reconexão)', () => {
    const evento = {
      vagaId: 'B2',
      estado: 'LIVRE' as const,
      ocorridoEm: new Date(),
      origem: 'mqtt' as const,
    };

    estado.aplicarOcupacao(evento);
    estado.aplicarOcupacao({ ...evento, ocorridoEm: new Date() });
    estado.aplicarOcupacao({ ...evento, ocorridoEm: new Date() });

    assert.equal(recebidas.length, 1, 'repetição não deve virar tráfego nem histórico');
  });

  it('descarta evento de vaga inexistente sem quebrar', () => {
    estado.aplicarOcupacao({
      vagaId: 'Z9',
      estado: 'OCUPADA',
      ocorridoEm: new Date(),
      origem: 'mqtt',
    });

    assert.equal(recebidas.length, 0);
    assert.equal(estado.instantaneo().length, 16);
  });

  it('marca OFFLINE apenas o que ainda não estava OFFLINE', () => {
    estado.aplicarOcupacao({
      vagaId: 'A1',
      estado: 'OCUPADA',
      ocorridoEm: new Date(),
      origem: 'mqtt',
    });
    recebidas = [];

    const mudadas = estado.marcarOffline(['A1', 'A2']);

    assert.equal(mudadas, 1, 'A2 já estava OFFLINE');
    assert.deepEqual(recebidas, [{ vaga: 'A1', estado: 'OFFLINE' }]);
  });

  it('conta há quanto tempo a vaga está no estado atual', () => {
    const dezMinutosAtras = new Date(Date.now() - 600_000);
    estado.aplicarOcupacao({
      vagaId: 'B8',
      estado: 'OCUPADA',
      ocorridoEm: dezMinutosAtras,
      origem: 'mqtt',
    });

    const vaga = estado.obter('B8');
    assert.ok(vaga?.haSegundos !== null && vaga!.haSegundos! >= 599);
  });

  it('grava no histórico só as transições, não as repetições', async () => {
    estado.aplicarOcupacao({ vagaId: 'A5', estado: 'OCUPADA', ocorridoEm: new Date(), origem: 'mqtt' });
    estado.aplicarOcupacao({ vagaId: 'A5', estado: 'OCUPADA', ocorridoEm: new Date(), origem: 'mqtt' });
    estado.aplicarOcupacao({ vagaId: 'A5', estado: 'LIVRE', ocorridoEm: new Date(), origem: 'mqtt' });
    await estado.encerrar();

    const historico = await repositorio.historicoDaVaga('A5', 10);
    assert.deepEqual(
      historico.map((e) => e.estado),
      ['LIVRE', 'OCUPADA'],
    );
  });
});
