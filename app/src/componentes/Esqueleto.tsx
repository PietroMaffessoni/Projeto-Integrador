import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { espacamento, raio } from '../tema';
import { usarTema } from '../tema-contexto';

/**
 * Placeholder pulsante enquanto o dado não chegou.
 *
 * Melhor do que a palavra "Carregando…" porque mostra o formato do que vem —
 * a tela não pula de layout quando o conteúdo aparece.
 */
export function Esqueleto({
  altura = 16,
  largura = '100%',
  estilo,
}: {
  altura?: number;
  largura?: number | `${number}%`;
  estilo?: ViewStyle;
}): React.JSX.Element {
  const { paleta } = usarTema();
  const pulso = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    animacao.start();
    return () => animacao.stop();
  }, [pulso]);

  return (
    <Animated.View
      style={[
        { height: altura, width: largura, backgroundColor: paleta.superficieSutil, opacity: pulso },
        estilos.bloco,
        estilo,
      ]}
    />
  );
}

/** Conjunto de esqueletos no formato de um cartão de conteúdo. */
export function EsqueletoDeCartao(): React.JSX.Element {
  return (
    <View style={estilos.grupo}>
      <Esqueleto altura={22} largura="45%" />
      <Esqueleto altura={12} largura="70%" />
      <Esqueleto altura={12} largura="60%" />
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { borderRadius: raio.sm },
  grupo: { gap: espacamento.sm },
});
