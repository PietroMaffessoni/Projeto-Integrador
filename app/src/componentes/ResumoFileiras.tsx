import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Vaga } from '../api/tipos';
import { espacamento, raio, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';
import { Cartao } from './Cartao';

/**
 * Contador de vagas livres por fileira.
 *
 * Vagas sem informação aparecem à parte, nunca somadas às livres: contá-las como
 * livres seria mentir, escondê-las também.
 */
export function ResumoFileiras({ vagas }: { vagas: Vaga[] }): React.JSX.Element {
  const { paleta } = usarTema();

  const livresTotal = vagas.filter((v) => v.estado === 'LIVRE').length;
  const semInfo = vagas.filter((v) => v.estado === 'OFFLINE').length;

  const fileiras = (['A', 'B'] as const).map((fileira) => {
    const daFileira = vagas.filter((v) => v.fileira === fileira);
    return {
      fileira,
      livres: daFileira.filter((v) => v.estado === 'LIVRE').length,
      ocupadas: daFileira.filter((v) => v.estado === 'OCUPADA').length,
      total: daFileira.length,
      semInfo: daFileira.filter((v) => v.estado === 'OFFLINE').length,
    };
  });

  return (
    <Cartao>
      <View style={estilos.heroi}>
        <Text style={[tipografia.numeroHeroi, { color: paleta.tintaPrimaria }]}>{livresTotal}</Text>
        <View style={estilos.heroiTexto}>
          <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria }]}>
            {livresTotal === 1 ? 'vaga livre' : 'vagas livres'}
          </Text>
          <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
            de {vagas.length} no setor-piloto
          </Text>
        </View>
      </View>

      <View style={estilos.fileiras}>
        {fileiras.map(({ fileira, livres, ocupadas, total, semInfo: semInfoFileira }) => (
          <View
            key={fileira}
            style={[estilos.fileira, { backgroundColor: paleta.superficieSutil, borderColor: paleta.borda }]}
          >
            <Text style={[tipografia.micro, { color: paleta.tintaSuave }]}>FILEIRA {fileira}</Text>

            <View style={estilos.medidor}>
              {Array.from({ length: total }, (_, i) => {
                const cor =
                  i < livres ? paleta.livre : i < livres + ocupadas ? paleta.ocupada : paleta.offline;
                return <View key={i} style={[estilos.traco, { backgroundColor: cor }]} />;
              })}
            </View>

            <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
              <Text style={{ fontWeight: '700', color: paleta.tintaPrimaria }}>{livres}</Text> livres
              {semInfoFileira > 0 ? ` · ${semInfoFileira} sem sinal` : ''}
            </Text>
          </View>
        ))}
      </View>

      {semInfo > 0 && (
        <Text style={[tipografia.legenda, { color: paleta.atencao }]}>
          ⚠ {semInfo} {semInfo === 1 ? 'vaga não está reportando' : 'vagas não estão reportando'} —
          não contam como livres.
        </Text>
      )}
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  heroi: { flexDirection: 'row', alignItems: 'center', gap: espacamento.md },
  heroiTexto: { flex: 1, gap: 1 },
  fileiras: { flexDirection: 'row', gap: espacamento.sm },
  fileira: {
    flex: 1,
    gap: espacamento.sm,
    padding: espacamento.md,
    borderRadius: raio.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  /** Um traço por vaga: o padrão de ocupação da fileira num relance. */
  medidor: { flexDirection: 'row', gap: 2 },
  traco: { flex: 1, height: 8, borderRadius: 2 },
});
