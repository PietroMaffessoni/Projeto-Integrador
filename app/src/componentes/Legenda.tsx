import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { coresDoEstado, espacamento, raio, tipografia, type Paleta_ } from '../tema';

type EstadoLegenda = 'LIVRE' | 'OCUPADA' | 'OFFLINE';

const ITENS: Array<{ estado: EstadoLegenda; rotulo: string }> = [
  { estado: 'LIVRE', rotulo: 'Livre' },
  { estado: 'OCUPADA', rotulo: 'Ocupada' },
  { estado: 'OFFLINE', rotulo: 'Sem informação' },
];

/**
 * A legenda repete a textura de cada estado, não só a cor — é o que permite
 * ler o mapa sem depender de distinguir verde de vermelho.
 */
export function Legenda({ paleta }: { paleta: Paleta_ }): React.JSX.Element {
  return (
    <View style={estilos.linha}>
      {ITENS.map(({ estado, rotulo }) => {
        const cores = coresDoEstado(paleta, estado);
        return (
          <View key={estado} style={estilos.item}>
            <Svg width={18} height={18}>
              <Rect x={0} y={0} width={18} height={18} rx={4} fill={cores.fundo} />
              {estado === 'OCUPADA' && (
                <>
                  <Path d="M0 18 L18 0" stroke={paleta.hachura} strokeWidth={2} />
                  <Path d="M0 9 L9 0" stroke={paleta.hachura} strokeWidth={2} />
                  <Path d="M9 18 L18 9" stroke={paleta.hachura} strokeWidth={2} />
                </>
              )}
              {estado === 'OFFLINE' && (
                <>
                  <Rect x={4} y={4} width={2.4} height={2.4} rx={1.2} fill={paleta.pontilhado} />
                  <Rect x={11} y={4} width={2.4} height={2.4} rx={1.2} fill={paleta.pontilhado} />
                  <Rect x={4} y={11} width={2.4} height={2.4} rx={1.2} fill={paleta.pontilhado} />
                  <Rect x={11} y={11} width={2.4} height={2.4} rx={1.2} fill={paleta.pontilhado} />
                </>
              )}
            </Svg>
            <Text style={[estilos.rotulo, { color: paleta.tintaSecundaria }]}>{rotulo}</Text>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento.lg,
    paddingVertical: espacamento.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.xs + 2,
    borderRadius: raio.sm,
  },
  rotulo: tipografia.legenda,
});
