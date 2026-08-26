import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Vaga } from '../api/tipos';
import { espacamento, raio, tipografia, type Paleta_ } from '../tema';

interface Props {
  vagas: Vaga[];
  paleta: Paleta_;
}

/**
 * Contador de vagas livres por fileira.
 *
 * O número grande é a resposta à única pergunta que o motorista faz ao abrir o
 * app — "tem vaga?" — então ele vem antes do mapa e sem enfeite. Vagas sem
 * informação aparecem à parte: contá-las como livres seria mentir, escondê-las
 * também.
 */
export function ResumoFileiras({ vagas, paleta }: Props): React.JSX.Element {
  const livresTotal = vagas.filter((v) => v.estado === 'LIVRE').length;
  const semInfo = vagas.filter((v) => v.estado === 'OFFLINE').length;

  const fileiras = (['A', 'B'] as const).map((fileira) => {
    const daFileira = vagas.filter((v) => v.fileira === fileira);
    return {
      fileira,
      livres: daFileira.filter((v) => v.estado === 'LIVRE').length,
      total: daFileira.length,
      semInfo: daFileira.filter((v) => v.estado === 'OFFLINE').length,
    };
  });

  return (
    <View style={[estilos.cartao, { backgroundColor: paleta.superficie, borderColor: paleta.borda }]}>
      <View style={estilos.heroi}>
        <Text style={[tipografia.numeroHeroi, { color: paleta.tintaPrimaria }]}>{livresTotal}</Text>
        <View style={estilos.heroiTexto}>
          <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria }]}>
            {livresTotal === 1 ? 'vaga livre' : 'vagas livres'}
          </Text>
          <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
            de {vagas.length} no estacionamento
          </Text>
        </View>
      </View>

      <View style={[estilos.divisor, { backgroundColor: paleta.borda }]} />

      <View style={estilos.fileiras}>
        {fileiras.map(({ fileira, livres, total, semInfo: semInfoFileira }) => (
          <View key={fileira} style={estilos.fileira}>
            <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>Fileira {fileira}</Text>
            <Text style={[estilos.numeroFileira, { color: paleta.tintaPrimaria }]}>
              {livres}
              <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}> / {total}</Text>
            </Text>
            {semInfoFileira > 0 && (
              <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
                {semInfoFileira} sem sinal
              </Text>
            )}
          </View>
        ))}
      </View>

      {semInfo > 0 && (
        <Text style={[estilos.aviso, { color: paleta.atencao }]}>
          ⚠ {semInfo} {semInfo === 1 ? 'vaga não está reportando' : 'vagas não estão reportando'} —
          não contam como livres.
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    borderRadius: raio.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: espacamento.lg,
    gap: espacamento.md,
  },
  heroi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.md,
  },
  heroiTexto: { flex: 1 },
  divisor: { height: StyleSheet.hairlineWidth },
  fileiras: {
    flexDirection: 'row',
    gap: espacamento.xl,
  },
  fileira: { gap: 2 },
  numeroFileira: { fontSize: 22, fontWeight: '700' },
  aviso: { ...tipografia.legenda, marginTop: 2 },
});
