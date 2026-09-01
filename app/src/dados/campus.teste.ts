import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CAPACIDADE_TOTAL_CAMPUS,
  EDIFICACOES,
  PLANTA,
  ZONAS,
  ZONA_PILOTO,
  cobertura,
  vagasInstrumentadas,
} from './campus';

interface Caixa {
  id: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
}

function seSobrepoe(a: Caixa, b: Caixa): boolean {
  return (
    a.x < b.x + b.largura &&
    b.x < a.x + a.largura &&
    a.y < b.y + b.altura &&
    b.y < a.y + a.altura
  );
}

describe('planta do campus', () => {
  it('soma exatamente a capacidade divulgada do campus', () => {
    const soma = ZONAS.reduce((total, zona) => total + zona.vagas, 0);
    assert.equal(
      soma,
      CAPACIDADE_TOTAL_CAMPUS,
      'a distribuição por setor precisa fechar com as 1.400 vagas',
    );
  });

  it('tem exatamente um setor ao vivo, com as 16 vagas da maquete', () => {
    const aoVivo = ZONAS.filter((z) => z.situacao === 'ao-vivo');
    assert.equal(aoVivo.length, 1);
    assert.equal(ZONA_PILOTO.vagas, 16);
    assert.equal(vagasInstrumentadas(), 16);
  });

  it('a cobertura é a fração honesta do campus', () => {
    assert.ok(Math.abs(cobertura() - 16 / 1400) < 1e-9);
    assert.ok(cobertura() < 0.02, 'o piloto cobre pouco mais de 1% — é assim que deve aparecer');
  });

  it('nenhum setor invade outro nem um prédio', () => {
    const caixas: Caixa[] = [...ZONAS, ...EDIFICACOES].map((item) => ({
      id: item.id,
      x: item.x,
      y: item.y,
      largura: item.largura,
      altura: item.altura,
    }));

    for (let i = 0; i < caixas.length; i += 1) {
      for (let j = i + 1; j < caixas.length; j += 1) {
        assert.ok(
          !seSobrepoe(caixas[i]!, caixas[j]!),
          `"${caixas[i]!.id}" se sobrepõe a "${caixas[j]!.id}" na planta`,
        );
      }
    }
  });

  it('tudo cabe dentro da planta', () => {
    for (const item of [...ZONAS, ...EDIFICACOES]) {
      assert.ok(item.x >= 0 && item.y >= 0, `${item.id} começa fora da planta`);
      assert.ok(
        item.x + item.largura <= PLANTA.largura && item.y + item.altura <= PLANTA.altura,
        `${item.id} estoura os limites do desenho`,
      );
    }
  });
});
