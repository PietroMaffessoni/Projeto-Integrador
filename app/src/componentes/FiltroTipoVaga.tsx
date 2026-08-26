import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Vaga } from '../api/tipos';
import type { FiltroTipo } from '../estado/loja';
import { espacamento, raio, tipografia, type Paleta_ } from '../tema';

const OPCOES: Array<{ valor: FiltroTipo; rotulo: string }> = [
  { valor: 'TODAS', rotulo: 'Todas' },
  { valor: 'COMUM', rotulo: 'Comuns' },
  { valor: 'PCD', rotulo: 'PCD' },
  { valor: 'IDOSO', rotulo: 'Idoso' },
];

interface Props {
  filtro: FiltroTipo;
  vagas: Vaga[];
  paleta: Paleta_;
  aoEscolher: (filtro: FiltroTipo) => void;
}

/** Filtro por tipo de vaga, com a contagem de livres de cada tipo no próprio rótulo. */
export function FiltroTipoVaga({ filtro, vagas, paleta, aoEscolher }: Props): React.JSX.Element {
  return (
    <View style={estilos.linha}>
      {OPCOES.map(({ valor, rotulo }) => {
        const doTipo = valor === 'TODAS' ? vagas : vagas.filter((v) => v.tipo === valor);
        const livres = doTipo.filter((v) => v.estado === 'LIVRE').length;
        const ativo = filtro === valor;

        return (
          <Pressable
            key={valor}
            onPress={() => aoEscolher(valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            accessibilityLabel={`${rotulo}: ${livres} livres de ${doTipo.length}`}
            style={[
              estilos.pilula,
              {
                backgroundColor: ativo ? paleta.destaque : paleta.superficie,
                borderColor: ativo ? paleta.destaque : paleta.borda,
              },
            ]}
          >
            <Text
              style={[
                tipografia.legenda,
                { color: ativo ? '#ffffff' : paleta.tintaSecundaria },
              ]}
            >
              {rotulo} · {livres}/{doTipo.length}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento.sm,
  },
  pilula: {
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
    borderRadius: raio.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
    justifyContent: 'center',
  },
});
