import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { espacamento, raio, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';

interface Props {
  texto: string;
  cor?: string;
  /** Ponto colorido antes do texto — usado no indicador de conexão. */
  comPonto?: boolean;
  discreto?: boolean;
}

/** Selo compacto: estado de conexão, contagem, etiqueta de seção. */
export function Selo({ texto, cor, comPonto, discreto }: Props): React.JSX.Element {
  const { paleta } = usarTema();
  const corFinal = cor ?? paleta.tintaSuave;

  return (
    <View
      style={[
        estilos.selo,
        {
          backgroundColor: discreto ? 'transparent' : `${corFinal}1f`,
          borderColor: discreto ? paleta.borda : 'transparent',
          borderWidth: discreto ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      {comPonto && <View style={[estilos.ponto, { backgroundColor: corFinal }]} />}
      <Text style={[tipografia.micro, { color: discreto ? paleta.tintaSuave : corFinal }]}>
        {texto.toUpperCase()}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.xs + 1,
    paddingHorizontal: espacamento.sm + 2,
    paddingVertical: 5,
    borderRadius: raio.pilula,
  },
  ponto: { width: 6, height: 6, borderRadius: 3 },
});
