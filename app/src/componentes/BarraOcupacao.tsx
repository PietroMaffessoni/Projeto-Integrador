import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ContagemPorEstado } from '../api/tipos';
import { coresDoEstado, espacamento, tipografia, type Paleta_ } from '../tema';

interface Props {
  rotulo: string;
  contagem: ContagemPorEstado;
  total: number;
  paleta: Paleta_;
}

/**
 * Barra empilhada de uma fileira: livre, ocupada e sem informação.
 *
 * Os três segmentos são separados por 2 px da cor da superfície — sem o
 * respiro, dois segmentos vizinhos se fundem numa mancha só e a leitura das
 * proporções se perde.
 */
export function BarraOcupacao({ rotulo, contagem, total, paleta }: Props): React.JSX.Element {
  const segmentos = (['LIVRE', 'OCUPADA', 'OFFLINE'] as const)
    .map((estado) => ({ estado, valor: contagem[estado] }))
    .filter((segmento) => segmento.valor > 0);

  return (
    <View style={estilos.bloco}>
      <View style={estilos.cabecalho}>
        <Text style={[tipografia.corpo, { color: paleta.tintaPrimaria }]}>{rotulo}</Text>
        <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
          {contagem.LIVRE} livre{contagem.LIVRE === 1 ? '' : 's'} de {total}
        </Text>
      </View>

      <View style={[estilos.trilho, { backgroundColor: paleta.superficie }]}>
        {segmentos.map(({ estado, valor }) => {
          const cores = coresDoEstado(paleta, estado);
          return (
            <View
              key={estado}
              style={[
                estilos.segmento,
                {
                  flex: valor,
                  backgroundColor: cores.fundo,
                },
              ]}
            >
              {valor / total > 0.12 && (
                <Text style={[estilos.valor, { color: cores.tinta }]}>{valor}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: espacamento.xs + 2 },
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  trilho: {
    flexDirection: 'row',
    height: 26,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
  },
  segmento: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  valor: { fontSize: 12, fontWeight: '700' },
});
