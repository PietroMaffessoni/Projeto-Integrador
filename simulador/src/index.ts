/**
 * Simulador da maquete.
 *
 * Publica no broker exatamente o que o ESP32 publicaria: mesmos tópicos, mesmos
 * payloads, mesma flag `retained`, mesmo heartbeat. Para o backend, os dois são
 * indistinguíveis — e é isso que permite ter app e servidor prontos antes de
 * existir um único fio (CLAUDE.md, fases 0 e 1).
 *
 * Uso:
 *   npm run dev                          # movimento aleatório contínuo
 *   npm run dev -- --modo cenario        # roteiro fixo da apresentação
 *   npm run dev -- --url mqtt://192.168.0.10:1883
 *   npm run dev -- --velocidade 3        # 3× mais rápido
 */

import mqtt from 'mqtt';
import { CENARIO_APRESENTACAO, estadoInicialDoCenario } from './cenarios.js';
import {
  IDS_VAGAS,
  INTERVALO_HEARTBEAT_MS,
  PREFIXO_PADRAO,
  topicoHeartbeat,
  topicoVaga,
  type Estado,
  type PayloadHeartbeat,
  type PayloadVaga,
} from './contrato.js';

interface Opcoes {
  url: string;
  prefixo: string;
  placa: string;
  modo: 'aleatorio' | 'cenario';
  velocidade: number;
  ocupacaoInicial: number;
}

function lerOpcoes(argumentos: string[]): Opcoes {
  const valor = (nome: string): string | undefined => {
    const indice = argumentos.indexOf(`--${nome}`);
    return indice >= 0 ? argumentos[indice + 1] : undefined;
  };

  const modo = valor('modo') === 'cenario' ? 'cenario' : 'aleatorio';
  const velocidade = Number(valor('velocidade') ?? 1);

  return {
    url: valor('url') ?? process.env.MQTT_URL ?? 'mqtt://localhost:1883',
    prefixo: valor('prefixo') ?? process.env.PREFIXO_MQTT ?? PREFIXO_PADRAO,
    placa: valor('placa') ?? 'placa-01',
    modo,
    velocidade: Number.isFinite(velocidade) && velocidade > 0 ? velocidade : 1,
    ocupacaoInicial: Number(valor('ocupacao') ?? 0.4),
  };
}

const opcoes = lerOpcoes(process.argv.slice(2));
const inicio = Date.now();
const estados = new Map<string, Estado>();
const temporizadores = new Set<NodeJS.Timeout>();

const cliente = mqtt.connect(opcoes.url, {
  clientId: `simulador-${Math.random().toString(16).slice(2, 8)}`,
  // Última vontade: se o simulador morrer, o broker avisa o backend — mesmo
  // comportamento que a placa terá quando a fonte cair no meio da demonstração.
  will: {
    topic: topicoHeartbeat(opcoes.prefixo, opcoes.placa),
    payload: Buffer.from(
      JSON.stringify({ estado: 'OFFLINE', timestamp: new Date().toISOString() }),
    ),
    qos: 1,
    retain: true,
  },
});

function publicarVaga(vaga: string, estado: Estado, narracao?: string): void {
  const payload: PayloadVaga = {
    estado,
    timestamp: new Date().toISOString(),
    rssi: -45 - Math.round(Math.random() * 30),
  };

  // `retained`: o broker guarda a última mensagem de cada vaga, então um backend
  // que reconecte recebe as 16 imediatamente, sem esperar movimento.
  cliente.publish(topicoVaga(opcoes.prefixo, vaga), JSON.stringify(payload), {
    qos: 1,
    retain: true,
  });

  estados.set(vaga, estado);

  const marcador = estado === 'OCUPADA' ? '■' : '□';
  const sufixo = narracao ? `  ← ${narracao}` : '';
  console.log(`${horaCurta()} ${marcador} ${vaga.padEnd(3)} ${estado}${sufixo}`);
}

function publicarHeartbeat(): void {
  const payload: PayloadHeartbeat = {
    estado: 'ONLINE',
    timestamp: new Date().toISOString(),
    rssi: -50 - Math.round(Math.random() * 20),
    uptime_s: Math.round((Date.now() - inicio) / 1000),
    firmware: 'simulador-1.0.0',
  };

  cliente.publish(topicoHeartbeat(opcoes.prefixo, opcoes.placa), JSON.stringify(payload), {
    qos: 1,
    retain: true,
  });
}

function horaCurta(): string {
  return new Date().toISOString().slice(11, 19);
}

function agendar(callback: () => void, atrasoMs: number): void {
  const temporizador = setTimeout(() => {
    temporizadores.delete(temporizador);
    callback();
  }, atrasoMs / opcoes.velocidade);
  temporizadores.add(temporizador);
}

/** Movimento contínuo: cada vaga alterna sozinha, com permanências plausíveis. */
function rodarAleatorio(): void {
  for (const vaga of IDS_VAGAS) {
    const estado: Estado = Math.random() < opcoes.ocupacaoInicial ? 'OCUPADA' : 'LIVRE';
    publicarVaga(vaga, estado);
    agendarProximaMudanca(vaga, estado);
  }
}

function agendarProximaMudanca(vaga: string, estadoAtual: Estado): void {
  // Carro estacionado fica mais tempo do que a vaga fica vazia — é o que se vê
  // num estacionamento de faculdade entre duas aulas.
  const [min, max] = estadoAtual === 'OCUPADA' ? [30, 180] : [15, 90];
  const espera = (min + Math.random() * (max - min)) * 1000;

  agendar(() => {
    const proximo: Estado = estadoAtual === 'OCUPADA' ? 'LIVRE' : 'OCUPADA';
    publicarVaga(vaga, proximo);
    agendarProximaMudanca(vaga, proximo);
  }, espera);
}

/** Roteiro fixo, para a defesa não depender de sorte. */
function rodarCenario(): void {
  for (const [vaga, estado] of estadoInicialDoCenario()) {
    publicarVaga(vaga, estado);
  }

  console.log(`\n${horaCurta()} ── cenário de apresentação (${CENARIO_APRESENTACAO.length} passos) ──\n`);

  for (const passo of CENARIO_APRESENTACAO) {
    agendar(() => publicarVaga(passo.vaga, passo.estado, passo.narracao), passo.em * 1000);
  }

  const fim = Math.max(...CENARIO_APRESENTACAO.map((p) => p.em)) + 4;
  agendar(() => {
    console.log(`\n${horaCurta()} ── cenário concluído; reiniciando ──\n`);
    rodarCenario();
  }, fim * 1000);
}

cliente.on('connect', () => {
  console.log(`Simulador conectado a ${opcoes.url}`);
  console.log(`  prefixo:    ${opcoes.prefixo}`);
  console.log(`  controlador:${opcoes.placa}`);
  console.log(`  modo:       ${opcoes.modo}${opcoes.velocidade !== 1 ? ` (${opcoes.velocidade}×)` : ''}`);
  console.log('');

  publicarHeartbeat();
  const batimento = setInterval(publicarHeartbeat, INTERVALO_HEARTBEAT_MS);
  temporizadores.add(batimento);

  if (opcoes.modo === 'cenario') rodarCenario();
  else rodarAleatorio();
});

cliente.on('error', (erro) => {
  console.error(`Erro MQTT: ${erro.message}`);
  console.error('O broker está no ar? `docker compose up -d mosquitto`');
});

function encerrar(): void {
  console.log('\nEncerrando — publicando OFFLINE do controlador.');
  for (const temporizador of temporizadores) clearTimeout(temporizador);
  temporizadores.clear();

  const despedida: PayloadHeartbeat = {
    estado: 'OFFLINE',
    timestamp: new Date().toISOString(),
    rssi: 0,
    uptime_s: Math.round((Date.now() - inicio) / 1000),
    firmware: 'simulador-1.0.0',
  };

  cliente.publish(
    topicoHeartbeat(opcoes.prefixo, opcoes.placa),
    JSON.stringify(despedida),
    { qos: 1, retain: true },
    () => cliente.end(false, {}, () => process.exit(0)),
  );
}

process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
