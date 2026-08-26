import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import { buscarAnomalias, buscarVagas } from '../api/cliente';
import type { Anomalia, Estado, MensagemMudanca, TipoVaga, Vaga } from '../api/tipos';
import { config } from '../config';
import { avisarVagaLiberada } from '../notificacoes';

const CHAVE_VIGIADAS = 'vagas:vigiadas';

export type FiltroTipo = 'TODAS' | TipoVaga;
export type SituacaoConexao = 'conectando' | 'ao-vivo' | 'reconectando' | 'sem-conexao';

interface Estadoloja {
  vagas: Vaga[];
  situacao: SituacaoConexao;
  erro: string | null;
  filtro: FiltroTipo;
  vagaSelecionada: string | null;
  anomalias: Anomalia[];
  /** Vagas que o usuário quer ser avisado quando liberarem. */
  vigiadas: string[];
  atualizadoEm: number;

  conectar: () => Promise<void>;
  desconectar: () => void;
  recarregar: () => Promise<void>;
  definirFiltro: (filtro: FiltroTipo) => void;
  selecionar: (vaga: string | null) => void;
  alternarVigilancia: (vaga: string) => Promise<void>;
}

let socket: Socket | null = null;

export const usarLoja = create<Estadoloja>((set, get) => ({
  vagas: [],
  situacao: 'conectando',
  erro: null,
  filtro: 'TODAS',
  vagaSelecionada: null,
  anomalias: [],
  vigiadas: [],
  atualizadoEm: 0,

  /**
   * Snapshot + delta (CLAUDE.md, seção 9).
   *
   * Busca o estado completo uma vez, depois vive só de WebSocket. A busca
   * completa se repete **apenas** quando a conexão cai e volta — nesse intervalo
   * podem ter passado mudanças que o app não viu, e é o único momento em que
   * refazer a leitura inteira se justifica.
   */
  async conectar() {
    await get().recarregar();
    await carregarVigiadas(set);

    if (socket) return;

    socket = io(config.urlSocket, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
      timeout: 8_000,
    });

    socket.on('connect', () => {
      const jaTinhaDados = get().vagas.length > 0;
      set({ situacao: 'ao-vivo', erro: null });
      // Reconexão: o que passou enquanto estávamos fora não chegou por delta.
      if (jaTinhaDados && get().atualizadoEm > 0) void get().recarregar();
    });

    socket.on('disconnect', () => set({ situacao: 'reconectando' }));
    socket.on('connect_error', () =>
      set({
        situacao: 'sem-conexao',
        erro: `Sem conexão com ${config.urlSocket}`,
      }),
    );

    socket.on('vaga:mudou', (mensagem: MensagemMudanca) => {
      aplicarMudanca(set, get, mensagem);
    });

    socket.on('alerta:anomalia', (payload: { anomalias: Anomalia[] }) => {
      set({ anomalias: payload.anomalias ?? [] });
    });
  },

  desconectar() {
    socket?.close();
    socket = null;
  },

  async recarregar() {
    try {
      const [resposta, alertas] = await Promise.all([
        buscarVagas(),
        buscarAnomalias().catch(() => ({ anomalias: [] as Anomalia[] })),
      ]);

      set({
        vagas: resposta.vagas,
        anomalias: alertas.anomalias,
        erro: null,
        atualizadoEm: Date.now(),
        situacao: socket?.connected ? 'ao-vivo' : 'conectando',
      });
    } catch (erro) {
      set({
        situacao: 'sem-conexao',
        erro: erro instanceof Error ? erro.message : 'Falha ao falar com o backend',
      });
    }
  },

  definirFiltro: (filtro) => set({ filtro }),
  selecionar: (vagaSelecionada) => set({ vagaSelecionada }),

  async alternarVigilancia(vaga) {
    const atuais = get().vigiadas;
    const proximas = atuais.includes(vaga) ? atuais.filter((v) => v !== vaga) : [...atuais, vaga];
    set({ vigiadas: proximas });
    await AsyncStorage.setItem(CHAVE_VIGIADAS, JSON.stringify(proximas)).catch(() => {});
  },
}));

function aplicarMudanca(
  set: (parcial: Partial<Estadoloja>) => void,
  get: () => Estadoloja,
  mensagem: MensagemMudanca,
): void {
  const { vagas, vigiadas } = get();
  const agora = new Date().toISOString();

  const atualizadas = vagas.map((vaga) =>
    vaga.id === mensagem.vaga
      ? { ...vaga, estado: mensagem.estado as Estado, atualizadoEm: agora, haSegundos: 0 }
      : vaga,
  );

  set({ vagas: atualizadas, atualizadoEm: Date.now() });

  if (mensagem.estado === 'LIVRE' && vigiadas.includes(mensagem.vaga)) {
    void avisarVagaLiberada(mensagem.vaga);
  }
}

async function carregarVigiadas(set: (parcial: Partial<Estadoloja>) => void): Promise<void> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_VIGIADAS);
    if (bruto) set({ vigiadas: JSON.parse(bruto) as string[] });
  } catch {
    // Preferência de conveniência: se não voltar, o app funciona igual.
  }
}

/** Vagas depois do filtro por tipo — o mapa pinta as demais como apagadas. */
export function aplicarFiltro(vagas: Vaga[], filtro: FiltroTipo): Vaga[] {
  return filtro === 'TODAS' ? vagas : vagas.filter((vaga) => vaga.tipo === filtro);
}
