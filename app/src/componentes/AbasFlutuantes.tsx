import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { vibrar } from '../estado/preferencias';
import { espacamento, raio, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';

export interface DefinicaoAba<T extends string> {
  id: T;
  rotulo: string;
  icone: string;
  /** Ponto de alerta sobre o ícone. */
  alerta?: boolean;
}

interface Props<T extends string> {
  abas: ReadonlyArray<DefinicaoAba<T>>;
  ativa: T;
  aoTrocar: (aba: T) => void;
}

/** Barra de abas flutuante, com alvo de toque de 48 pt em cada item. */
export function AbasFlutuantes<T extends string>({
  abas,
  ativa,
  aoTrocar,
}: Props<T>): React.JSX.Element {
  const { paleta, sombra } = usarTema();

  return (
    <View style={estilos.area} pointerEvents="box-none">
      <View
        style={[
          estilos.barra,
          sombra(2),
          { backgroundColor: paleta.superficieElevada, borderColor: paleta.borda },
        ]}
      >
        {abas.map((aba) => {
          const selecionada = aba.id === ativa;
          return (
            <Pressable
              key={aba.id}
              onPress={() => {
                if (!selecionada) void vibrar('leve');
                aoTrocar(aba.id);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: selecionada }}
              accessibilityLabel={aba.rotulo}
              style={[
                estilos.aba,
                selecionada && { backgroundColor: paleta.destaqueSuave },
              ]}
            >
              <View>
                <Text
                  style={{
                    fontSize: 17,
                    color: selecionada ? paleta.destaque : paleta.tintaSuave,
                  }}
                >
                  {aba.icone}
                </Text>
                {aba.alerta && <View style={[estilos.ponto, { backgroundColor: paleta.critico }]} />}
              </View>
              <Text
                style={[
                  tipografia.micro,
                  { color: selecionada ? paleta.destaque : paleta.tintaSuave },
                ]}
                numberOfLines={1}
              >
                {aba.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  area: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: espacamento.lg,
    paddingBottom: espacamento.md,
  },
  barra: {
    flexDirection: 'row',
    borderRadius: raio.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: espacamento.xs + 2,
    gap: espacamento.xs,
  },
  aba: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
    borderRadius: raio.lg,
    paddingVertical: espacamento.xs,
  },
  ponto: {
    position: 'absolute',
    top: -1,
    right: -7,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
