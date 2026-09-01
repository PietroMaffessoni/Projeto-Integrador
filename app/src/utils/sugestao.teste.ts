import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Vaga } from '../api/tipos';
import { melhorVaga } from './sugestao';

function vaga(id: string, estado: Vaga['estado'], tipo: Vaga['tipo'] = 'COMUM'): Vaga {
  return {
    id,
    fileira: id[0] as 'A' | 'B',
    posicao: Number(id.slice(1)),
    tipo,
    estado,
    atualizadoEm: new Date().toISOString(),
    haSegundos: 10,
  };
}

describe('melhor vaga', () => {
  it('escolhe a livre mais próxima da entrada', () => {
    const sugestao = melhorVaga(
      [vaga('A1', 'LIVRE'), vaga('A6', 'LIVRE'), vaga('A3', 'LIVRE')],
      'TODAS',
    );

    // A numeração cresce em direção à entrada: A6 é a mais perto.
    assert.equal(sugestao?.vaga.id, 'A6');
    assert.equal(sugestao?.outrasLivres, 2);
  });

  it('não sugere vaga reservada para quem não filtrou por ela', () => {
    const sugestao = melhorVaga([vaga('A8', 'LIVRE', 'PCD'), vaga('A2', 'LIVRE')], 'TODAS');

    assert.equal(sugestao?.vaga.id, 'A2', 'A8 é PCD e não deve ser oferecida a todos');
  });

  it('sugere a reservada quando o filtro é dela', () => {
    const sugestao = melhorVaga([vaga('A8', 'LIVRE', 'PCD'), vaga('A2', 'LIVRE')], 'PCD');

    assert.equal(sugestao?.vaga.id, 'A8');
    assert.equal(sugestao?.outrasLivres, 0);
  });

  it('não inventa sugestão quando não há vaga livre', () => {
    assert.equal(melhorVaga([vaga('A1', 'OCUPADA'), vaga('A2', 'OFFLINE')], 'TODAS'), null);
  });

  it('não conta vaga OFFLINE como livre', () => {
    assert.equal(melhorVaga([vaga('A7', 'OFFLINE'), vaga('A1', 'LIVRE')], 'TODAS')?.vaga.id, 'A1');
  });

  it('calcula a distância na escala real, crescendo com a distância da entrada', () => {
    const perto = melhorVaga([vaga('A8', 'LIVRE')], 'TODAS');
    const longe = melhorVaga([vaga('A1', 'LIVRE')], 'TODAS');

    assert.ok(perto && longe);
    assert.ok(perto.metros < longe.metros, 'A8 tem de estar mais perto que A1');
    // A placa tem 345 mm em escala 1:64 → cerca de 22 m reais de ponta a ponta.
    assert.ok(longe.metros > 0 && longe.metros < 25, `distância implausível: ${longe.metros} m`);
  });
});
