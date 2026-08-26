import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RepositorioMemoria } from '../dados/repositorio-memoria.js';
import { detectarAnomalias } from './anomalias.js';
import { calcularEstatisticas } from './estatisticas.js';
import { preverOcupacao } from './previsao.js';
import { ServicoDeEstado } from './servico-estado.js';

async function montarCenario(): Promise<{ repositorio: RepositorioMemoria; estado: ServicoDeEstado }> {
  const repositorio = new RepositorioMemoria();
  await repositorio.iniciar();
  const estado = new ServicoDeEstado(repositorio);
  await estado.carregar();
  return { repositorio, estado };
}

describe('estatísticas', () => {
  it('não conta vaga OFFLINE como livre na taxa de ocupação', async () => {
    const { estado } = await montarCenario();
    const agora = new Date();

    estado.aplicarOcupacao({ vagaId: 'A1', estado: 'OCUPADA', ocorridoEm: agora, origem: 'mqtt' });
    estado.aplicarOcupacao({ vagaId: 'A2', estado: 'LIVRE', ocorridoEm: agora, origem: 'mqtt' });
    // As outras 14 seguem OFFLINE.

    const estatisticas = calcularEstatisticas(estado.instantaneo());

    assert.equal(estatisticas.taxaOcupacao, 0.5, '1 ocupada entre 2 conhecidas');
    assert.equal(estatisticas.semInformacao, 14);
    assert.equal(estatisticas.porEstado.LIVRE, 1);
  });

  it('separa as contagens por fileira', async () => {
    const { estado } = await montarCenario();
    const agora = new Date();
    estado.aplicarOcupacao({ vagaId: 'A1', estado: 'LIVRE', ocorridoEm: agora, origem: 'mqtt' });
    estado.aplicarOcupacao({ vagaId: 'B1', estado: 'OCUPADA', ocorridoEm: agora, origem: 'mqtt' });

    const { porFileira } = calcularEstatisticas(estado.instantaneo());
    const fileiraA = porFileira.find((f) => f.fileira === 'A');
    const fileiraB = porFileira.find((f) => f.fileira === 'B');

    assert.equal(fileiraA?.LIVRE, 1);
    assert.equal(fileiraB?.OCUPADA, 1);
    assert.equal(fileiraA?.total, 8);
  });
});

describe('previsão', () => {
  it('pondera pelo tempo, não pelo número de eventos', async () => {
    const { repositorio } = await montarCenario();
    const base = new Date();
    base.setHours(10, 0, 0, 0);
    const umDiaAtras = new Date(base.getTime() - 24 * 3600 * 1000);

    // Ocupada às 10h por 45 min, livre nos 15 min restantes → 75% de ocupação.
    await repositorio.registrarEventos([
      { vagaId: 'A1', estado: 'OCUPADA', ocorridoEm: umDiaAtras },
      { vagaId: 'A1', estado: 'LIVRE', ocorridoEm: new Date(umDiaAtras.getTime() + 45 * 60_000) },
      { vagaId: 'A1', estado: 'OCUPADA', ocorridoEm: new Date(umDiaAtras.getTime() + 60 * 60_000) },
    ]);

    const previsao = await preverOcupacao(repositorio, 'A1', base);
    const faixa = previsao.faixas.find((f) => f.hora === 10 && f.diaSemana === umDiaAtras.getDay());

    assert.ok(faixa, 'deveria existir a faixa das 10h');
    assert.ok(Math.abs(faixa.taxaOcupacao - 0.75) < 0.02, `esperado ~0,75, veio ${faixa.taxaOcupacao}`);
  });

  it('admite quando não há histórico suficiente', async () => {
    const { repositorio } = await montarCenario();
    const previsao = await preverOcupacao(repositorio, null);

    assert.equal(previsao.amostragemSuficiente, false);
    assert.deepEqual(previsao.melhoresHorariosHoje, []);
  });
});

describe('anomalias', () => {
  it('acusa sensor oscilando acima do limiar', async () => {
    const { repositorio, estado } = await montarCenario();
    const agora = new Date();

    const eventos = Array.from({ length: 14 }, (_, i) => ({
      vagaId: 'A4',
      estado: (i % 2 === 0 ? 'OCUPADA' : 'LIVRE') as 'OCUPADA' | 'LIVRE',
      ocorridoEm: new Date(agora.getTime() - i * 10_000),
    }));
    await repositorio.registrarEventos(eventos);

    const anomalias = await detectarAnomalias(estado, repositorio, agora);
    const oscilando = anomalias.find((a) => a.tipo === 'SENSOR_OSCILANDO');

    assert.ok(oscilando, 'esperava detectar oscilação em A4');
    assert.equal(oscilando.alvo, 'A4');
  });

  it('não acusa nada num estacionamento parado', async () => {
    const { repositorio, estado } = await montarCenario();
    const anomalias = await detectarAnomalias(estado, repositorio);

    assert.deepEqual(anomalias, [], 'sem movimento, silêncio é o comportamento correto');
  });

  it('acusa ocupação longa demais para ser verdade', async () => {
    const { repositorio, estado } = await montarCenario();
    const agora = new Date();
    const ontem = new Date(agora.getTime() - 20 * 3600 * 1000);

    estado.aplicarOcupacao({ vagaId: 'B3', estado: 'OCUPADA', ocorridoEm: ontem, origem: 'mqtt' });

    const anomalias = await detectarAnomalias(estado, repositorio, agora);
    const presa = anomalias.find((a) => a.tipo === 'OCUPACAO_IMPLAUSIVEL');

    assert.ok(presa);
    assert.equal(presa.alvo, 'B3');
  });
});
