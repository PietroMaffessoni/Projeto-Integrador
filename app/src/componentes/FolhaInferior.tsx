import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { duracao, espacamento, raio } from '../tema';
import { usarTema } from '../tema-contexto';

interface Props {
  visivel: boolean;
  aoFechar: () => void;
  children: React.ReactNode;
}

/** Painel deslizante padrão do app: detalhe de vaga, detalhe de setor. */
export function FolhaInferior({ visivel, aoFechar, children }: Props): React.JSX.Element {
  const { paleta } = usarTema();
  const entrada = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrada, {
      toValue: visivel ? 1 : 0,
      duration: duracao.media,
      useNativeDriver: true,
    }).start();
  }, [visivel, entrada]);

  const deslocamento = entrada.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <Pressable style={estilos.fundo} onPress={aoFechar} accessibilityLabel="Fechar">
        {/* Captura o toque para que ele não chegue ao fundo, que fecha o painel. */}
        <Pressable onPress={() => {}} style={estilos.ancora}>
          <Animated.View
            style={[
              estilos.folha,
              {
                backgroundColor: paleta.superficieElevada,
                borderColor: paleta.borda,
                opacity: entrada,
                transform: [{ translateY: deslocamento }],
              },
            ]}
          >
            <View style={[estilos.puxador, { backgroundColor: paleta.bordaForte }]} />
            {children}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  ancora: { width: '100%' },
  folha: {
    borderTopLeftRadius: raio.xl,
    borderTopRightRadius: raio.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: espacamento.lg,
    paddingBottom: espacamento.xl + 12,
    gap: espacamento.md,
    maxHeight: '85%',
  },
  puxador: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: espacamento.xs,
  },
});
