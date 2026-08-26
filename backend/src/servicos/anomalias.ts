import type { VagaAtual } from '../contrato/eventos.js';
import type { VagaId } from '../contrato/vagas.js';
import type { Repositorio } from '../dados/repositorio.js';
import type { ServicoDeEstado } from './servico-estado.js';

/** Transições numa janela curta a partir das quais o sensor é considerado instável. */
const LIMIAR_OSCILACAO = 12;
const JANELA_OSCILACAO_MS = 5 * 60 * 1000;

/** Tempo ocupado além do qual o carro provavelmente não existe mais. */
const OCUPACAO_IMPLAUSIVEL_S = 12 * 60 * 60;

/** Janela para comparar a atividade de uma vaga com a das demais. */
const JANELA_INERCIA_MS = 24 * 60 * 60 * 1000;
/** Movimento mínimo no estacionamento para que a comparação signifique algo. */
const TRANSICOES_MINIMAS_NO_PATIO = 20;

export type TipoAnomalia =
  | 'SENSOR_OSCILANDO'
  | 'SENSOR_INERTE'
  | 'OCUPACAO_IMPLAUSIVEL'
  | 'CONTROLADOR_OFFLINE';
export type Severidade = 'aviso' | 'critico';

export interface Anomalia {
  tipo: TipoAnomalia;
  severidade: Severidade;
  alvo: VagaId | string;
  mensagem: string;
  /** O que fazer a respeito — texto curto, exibido no app. */
  sugestao: string;
  detectadaEm: string;
}

/**
 * Detecção de sensor defeituoso a partir do histórico.
 *
 * Um sensor infravermelho não falha avisando: ele passa a mentir. As três
 * assinaturas abaixo distinguem os modos de falha que a maquete realmente
 * apresenta — ruído de borda, sensor morto e leitura presa em OCUPADA.
 */
export async function detectarAnomalias(
  estado: ServicoDeEstado,
  repositorio: Repositorio,
  agora: Date = new Date(),
): Promise<Anomalia[]> {
  const vagas = estado.instantaneo(agora);
  const anomalias: Anomalia[] = [];

  anomalias.push(...(await detectarOscilacao(repositorio, agora)));
  anomalias.push(...detectarOcupacaoImplausivel(vagas, agora));
  anomalias.push(...(await detectarSensoresInertes(repositorio, vagas, agora)));

  const ordem: Record<Severidade, number> = { critico: 0, aviso: 1 };
  return anomalias.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);
}

/**
 * Ruído de borda: o carrinho parado exatamente no limite de detecção faz o
 * comparador oscilar. O debounce de 300 ms segura tremulação rápida, mas não
 * uma sombra que entra e sai a cada poucos segundos.
 */
async function detectarOscilacao(repositorio: Repositorio, agora: Date): Promise<Anomalia[]> {
  const desde = new Date(agora.getTime() - JANELA_OSCILACAO_MS);
  const eventos = await repositorio.eventosDesde(desde);

  const contagem = new Map<VagaId, number>();
  for (const evento of eventos) {
    if (evento.estado === 'OFFLINE') continue;
    contagem.set(evento.vagaId, (contagem.get(evento.vagaId) ?? 0) + 1);
  }

  return [...contagem.entries()]
    .filter(([, total]) => total >= LIMIAR_OSCILACAO)
    .map(([vagaId, total]) => ({
      tipo: 'SENSOR_OSCILANDO' as const,
      severidade: 'critico' as const,
      alvo: vagaId,
      mensagem: `${total} mudanças de estado em 5 minutos na vaga ${vagaId}.`,
      sugestao: 'Ajustar o trimpot do LM393 ou conferir a altura do sensor no berço.',
      detectadaEm: agora.toISOString(),
    }));
}

/** Leitura presa: sujeira na lente ou obstáculo fixo sobre o sensor. */
function detectarOcupacaoImplausivel(vagas: readonly VagaAtual[], agora: Date): Anomalia[] {
  return vagas
    .filter((v) => v.estado === 'OCUPADA' && (v.haSegundos ?? 0) > OCUPACAO_IMPLAUSIVEL_S)
    .map((vaga) => ({
      tipo: 'OCUPACAO_IMPLAUSIVEL' as const,
      severidade: 'aviso' as const,
      alvo: vaga.id,
      mensagem: `Vaga ${vaga.id} ocupada há ${Math.round((vaga.haSegundos ?? 0) / 3600)} h sem interrupção.`,
      sugestao: 'Limpar a lente do TCRT5000 e verificar se algo cobre o furo do sensor.',
      detectadaEm: agora.toISOString(),
    }));
}

/**
 * Sensor inerte: a vaga não registra **nenhuma** transição enquanto o resto do
 * estacionamento gira.
 *
 * Silêncio, sozinho, não prova nada: o firmware publica apenas na mudança de
 * estado (CLAUDE.md, seção 11), então uma vaga com um carro parado há três
 * horas fica legitimamente calada. O que denuncia o sensor morto é a inércia
 * *comparada* — zero transições em 24 h num pátio que se moveu dezenas de vezes.
 *
 * A guarda dos 20 movimentos evita acusar sensores durante um fim de semana
 * vazio, quando não se mexer é o comportamento certo.
 */
async function detectarSensoresInertes(
  repositorio: Repositorio,
  vagas: readonly VagaAtual[],
  agora: Date,
): Promise<Anomalia[]> {
  const eventos = await repositorio.eventosDesde(new Date(agora.getTime() - JANELA_INERCIA_MS));
  const transicoes = eventos.filter((e) => e.estado !== 'OFFLINE');
  if (transicoes.length < TRANSICOES_MINIMAS_NO_PATIO) return [];

  const porVaga = new Map<VagaId, number>();
  for (const evento of transicoes) {
    porVaga.set(evento.vagaId, (porVaga.get(evento.vagaId) ?? 0) + 1);
  }

  const horas = Math.round(JANELA_INERCIA_MS / 3_600_000);

  return vagas
    .filter((vaga) => vaga.estado !== 'OFFLINE' && !porVaga.has(vaga.id))
    .map((vaga) => ({
      tipo: 'SENSOR_INERTE' as const,
      severidade: 'critico' as const,
      alvo: vaga.id,
      mensagem: `Vaga ${vaga.id} não mudou de estado em ${horas} h, enquanto o estacionamento registrou ${transicoes.length} movimentos.`,
      sugestao: 'Conferir o conector JST da vaga e a continuidade até o PCF8574.',
      detectadaEm: agora.toISOString(),
    }));
}
