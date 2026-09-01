import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { coresDoEstado, espacamento, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';

type EstadoLegenda = 'LIVRE' | 'OCUPADA' | 'OFFLINE';

const ITENS: Array<{ estado: EstadoLegenda; rotulo: string }> = [
  { estado: 'LIVRE', rotulo: 'Livre' },
  { estado: 'OCUPADA', rotulo: 'Ocupada' },
  { estado: 'OFFLINE', rotulo: 'Sem sinal' },
];

/**
 * A legenda repete o **desenho** de cada estado, não só a cor.
 *
 * De nada adiantaria a silhueta do carro existir no mapa se aqui aparecessem só
 * quadradinhos coloridos: quem não distingue verde de vermelho leria a legenda
 * como três tons iguais.
 */
export function Legenda(): React.JSX.Element {
  const { paleta } = usarTema();

  return (
    <View style={estilos.linha}>
      {ITENS.map(({ estado, rotulo }) => {
        const cores = coresDoEstado(paleta, estado);
        return (
          <View key={estado} style={estilos.item}>
            <Svg width={22} height={22}>
              <Rect x={0} y={0} width={22} height={22} rx={5} fill={cores.fundo} />
              {estado === 'OCUPADA' && (
                <>
                  <Rect x={6} y={4} width={10} height={14} rx={3} fill={paleta.carro} />
                  <Rect x={7.6} y={7.5} width={6.8} height={5.5} rx={1.6} fill={cores.fundo} opacity={0.55} />
                </>
              )}
              {estado === 'OFFLINE' && (
                <>
                  <Rect x={5} y={5} width={2.4} height={2.4} rx={1.2} fill={paleta.pontilhado} />
                  <Rect x={13} y={5} width={2.4} height={2.4} rx={1.2} fill={paleta.pontilhado} />
                  <Rect x={5} y={13} width={2.4} height={2.4} rx={1.2} fill={paleta.pontilhado} />
                  <Rect x={13} y={13} width={2.4} height={2.4} rx={1.2} fill={paleta.pontilhado} />
                </>
              )}
            </Svg>
            <Text style={[tipografia.legenda, { color: paleta.tintaSecundaria }]}>{rotulo}</Text>
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
    paddingVertical: espacamento.xs,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: espacamento.xs + 2 },
});
