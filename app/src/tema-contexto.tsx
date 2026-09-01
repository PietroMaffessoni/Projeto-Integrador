import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme, type ViewStyle } from 'react-native';
import { usarPreferencias } from './estado/preferencias';
import { paletaDe, sombra, type EsquemaCor, type Paleta } from './tema';

interface Tema {
  paleta: Paleta;
  esquema: EsquemaCor;
  /** Elevação já resolvida para o esquema atual. */
  sombra: (nivel?: 1 | 2) => ViewStyle;
}

const TemaContexto = createContext<Tema | null>(null);

/**
 * O tema segue o sistema por padrão, mas o usuário pode fixar claro ou escuro.
 *
 * Vale a pena poder fixar: um estacionamento coberto no meio da tarde não muda o
 * modo do celular, e quem está com o app na mão sabe melhor do que o sistema
 * operacional o que dá para enxergar ali.
 */
export function ProvedorDeTema({ children }: { children: React.ReactNode }): React.JSX.Element {
  const esquemaDoSistema = useColorScheme();
  const modo = usarPreferencias((e) => e.modoTema);

  const valor = useMemo<Tema>(() => {
    const esquema: EsquemaCor =
      modo === 'sistema' ? (esquemaDoSistema === 'dark' ? 'escuro' : 'claro') : modo;

    return {
      esquema,
      paleta: paletaDe(esquema),
      sombra: (nivel: 1 | 2 = 1) => sombra(esquema, nivel),
    };
  }, [modo, esquemaDoSistema]);

  return <TemaContexto.Provider value={valor}>{children}</TemaContexto.Provider>;
}

export function usarTema(): Tema {
  const tema = useContext(TemaContexto);
  if (!tema) throw new Error('usarTema precisa estar dentro de <ProvedorDeTema>');
  return tema;
}
