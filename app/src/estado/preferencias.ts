import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { create } from 'zustand';

const CHAVE_TEMA = 'vagas:tema';
const CHAVE_VIBRACAO = 'vagas:vibracao';

export type ModoTema = 'sistema' | 'claro' | 'escuro';

interface Preferencias {
  modoTema: ModoTema;
  vibracao: boolean;
  carregada: boolean;

  carregar: () => Promise<void>;
  alternarTema: () => Promise<void>;
  definirTema: (modo: ModoTema) => Promise<void>;
  alternarVibracao: () => Promise<void>;
}

/** Ciclo do botão de tema: segue o sistema → claro → escuro → segue o sistema. */
const PROXIMO: Record<ModoTema, ModoTema> = {
  sistema: 'claro',
  claro: 'escuro',
  escuro: 'sistema',
};

export const usarPreferencias = create<Preferencias>((set, get) => ({
  modoTema: 'sistema',
  vibracao: true,
  carregada: false,

  async carregar() {
    try {
      const [tema, vibracao] = await Promise.all([
        AsyncStorage.getItem(CHAVE_TEMA),
        AsyncStorage.getItem(CHAVE_VIBRACAO),
      ]);
      set({
        modoTema: (tema as ModoTema) ?? 'sistema',
        vibracao: vibracao === null ? true : vibracao === 'true',
        carregada: true,
      });
    } catch {
      // Preferência é conveniência: sem ela o app abre no padrão e funciona.
      set({ carregada: true });
    }
  },

  async alternarTema() {
    await get().definirTema(PROXIMO[get().modoTema]);
  },

  async definirTema(modo) {
    set({ modoTema: modo });
    try {
      await AsyncStorage.setItem(CHAVE_TEMA, modo);
    } catch {}
  },

  async alternarVibracao() {
    const proxima = !get().vibracao;
    set({ vibracao: proxima });
    try {
      await AsyncStorage.setItem(CHAVE_VIBRACAO, String(proxima));
    } catch {}
  },
}));

/**
 * Retorno tátil.
 *
 * Vibrar é a única confirmação que funciona com o celular no bolso e com a
 * atenção no estacionamento, não na tela — por isso o aviso de vaga liberada
 * vibra. Fica desligável porque nem todo mundo quer.
 */
export async function vibrar(tipo: 'leve' | 'sucesso' | 'alerta' = 'leve'): Promise<void> {
  if (!usarPreferencias.getState().vibracao) return;
  if (Platform.OS === 'web') return;

  try {
    if (tipo === 'sucesso') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (tipo === 'alerta') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Aparelho sem motor háptico: silêncio é a resposta certa.
  }
}
