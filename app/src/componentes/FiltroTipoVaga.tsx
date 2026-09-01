import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Vaga } from '../api/tipos';
import type { FiltroTipo } from '../estado/loja';
import { vibrar } from '../estado/preferencias';
import { espacamento, raio, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';

const OPCOES: Array<{ valor: FiltroTipo; rotulo: string }> = [
  { valor: 'TODAS', rotulo: 'Todas' },
  { valor: 'COMUM', rotulo: 'Comuns' },
  { valor: 'PCD', rotulo: 'PCD' },
  { valor: 'IDOSO', rotulo: 'Idoso' },
];

interface Props {
  filtro: FiltroTipo;
  vagas: Vaga[];
  aoEscolher: (filtro: FiltroTipo) => void;
}

/** Filtro por tipo de vaga, com a contagem de livres no próprio rótulo. */
export function FiltroTipoVaga({ filtro, vagas, aoEscolher }: Props): React.JSX.Element {
  const { paleta } = usarTema();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={estilos.linha}
    >
      {OPCOES.map(({ valor, rotulo }) => {
        const doTipo = valor === 'TODAS' ? vagas : vagas.filter((v) => v.tipo === valor);
        const livres = doTipo.filter((v) => v.estado === 'LIVRE').length;
        const ativo = filtro === valor;

        return (
          <Pressable
            key={valor}
            onPress={() => {
              if (!ativo) void vibrar('leve');
              aoEscolher(valor);
            }}
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
              style={[tipografia.legenda, { color: ativo ? '#ffffff' : paleta.tintaSecundaria }]}
            >
              {rotulo}
            </Text>
            <View
              style={[
                estilos.contador,
                { backgroundColor: ativo ? 'rgba(255,255,255,0.22)' : paleta.superficieSutil },
              ]}
            >
              <Text
                style={[
                  tipografia.micro,
                  { color: ativo ? '#ffffff' : livres > 0 ? paleta.tintaPrimaria : paleta.tintaSuave },
                ]}
              >
                {livres}/{doTipo.length}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', gap: espacamento.sm, paddingRight: espacamento.lg },
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    paddingLeft: espacamento.md,
    paddingRight: espacamento.sm,
    paddingVertical: espacamento.sm,
    borderRadius: raio.pilula,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 40,
  },
  contador: {
    paddingHorizontal: espacamento.sm,
    paddingVertical: 3,
    borderRadius: raio.pilula,
  },
});
