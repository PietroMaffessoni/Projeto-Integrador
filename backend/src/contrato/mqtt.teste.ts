import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PREFIXO_PADRAO,
  controladorDoTopico,
  esquemaPayloadVaga,
  topicoHeartbeat,
  topicoVaga,
  vagaDoTopico,
} from './mqtt.js';
import { IDS_VAGAS, normalizarVagaId, tipoDaVaga } from './vagas.js';

describe('contrato MQTT', () => {
  it('monta e desmonta o tópico de vaga', () => {
    const topico = topicoVaga(PREFIXO_PADRAO, 'A3');
    assert.equal(topico, 'maua/estacionamento/vaga/A3');
    assert.equal(vagaDoTopico(PREFIXO_PADRAO, topico), 'A3');
  });

  it('recusa tópicos fora do contrato', () => {
    assert.equal(vagaDoTopico(PREFIXO_PADRAO, 'outro/sistema/vaga/A3'), null);
    assert.equal(vagaDoTopico(PREFIXO_PADRAO, 'maua/estacionamento/vaga/A3/extra'), null);
    assert.equal(vagaDoTopico(PREFIXO_PADRAO, 'maua/estacionamento/vaga/'), null);
  });

  it('desmonta o tópico de heartbeat', () => {
    const topico = topicoHeartbeat(PREFIXO_PADRAO, 'placa-01');
    assert.equal(topico, 'maua/estacionamento/controlador/placa-01/heartbeat');
    assert.equal(controladorDoTopico(PREFIXO_PADRAO, topico), 'placa-01');
    assert.equal(controladorDoTopico(PREFIXO_PADRAO, 'maua/estacionamento/vaga/A1'), null);
  });

  it('aceita o payload do firmware e recusa estado inventado', () => {
    const valido = esquemaPayloadVaga.safeParse({
      estado: 'OCUPADA',
      timestamp: '2026-08-26T14:32:05Z',
      rssi: -58,
    });
    assert.ok(valido.success);

    assert.equal(esquemaPayloadVaga.safeParse({ estado: 'TALVEZ' }).success, false);
    // OFFLINE é conclusão do backend, não afirmação de sensor.
    assert.equal(esquemaPayloadVaga.safeParse({ estado: 'OFFLINE' }).success, false);
  });

  it('payload mínimo é só o estado', () => {
    assert.ok(esquemaPayloadVaga.safeParse({ estado: 'LIVRE' }).success);
  });
});

describe('catálogo de vagas', () => {
  it('tem 16 vagas, A1..A8 e B1..B8', () => {
    assert.equal(IDS_VAGAS.length, 16);
    assert.equal(IDS_VAGAS[0], 'A1');
    assert.equal(IDS_VAGAS.at(-1), 'B8');
  });

  it('normaliza minúsculas e recusa o que não existe', () => {
    assert.equal(normalizarVagaId('a3'), 'A3');
    assert.equal(normalizarVagaId(' b8 '), 'B8');
    assert.equal(normalizarVagaId('A9'), null);
    assert.equal(normalizarVagaId('C1'), null);
  });

  it('reserva PCD e idoso junto à entrada', () => {
    assert.equal(tipoDaVaga('A8'), 'PCD');
    assert.equal(tipoDaVaga('B7'), 'IDOSO');
    assert.equal(tipoDaVaga('A1'), 'COMUM');
  });
});
