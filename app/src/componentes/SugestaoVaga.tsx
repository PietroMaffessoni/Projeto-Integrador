import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Sugestao } from '../utils/sugestao';
import { espacamento, raio, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';

interface Props {
  sugestao: Sugestao | null;
  rotaVisivel: boolean;
  aoAlternarRota: () => void;
  aoAbrirDetalhe: () => void;
  semDados: boolean;
}

/**
 * A resposta direta à pergunta que leva alguém a abrir este app.
 *
 * Ninguém abre um aplicativo de estacionamento para estudar um mapa: abre para
 * saber onde parar. O mapa fica logo abaixo, para quem quiser conferir.
 */
export function SugestaoVaga({
  sugestao,
  rotaVisivel,
  aoAlternarRota,
  aoAbrirDetalhe,
  semDados,
}: Props): React.JSX.Element {
  const { paleta, sombra } = usarTema();

  if (semDados) {
    return (
      <View style={[estilos.caixa, sombra(1), { backgroundColor: paleta.superficie, borderColor: paleta.borda }]}>
        <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria }]}>
          Sem informação do estacionamento
        </Text>
        <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
          Os sensores não estão reportando. O app prefere dizer isso a arriscar um palpite.
        </Text>
      </View>
    );
  }

  if (!sugestao) {
    return (
      <View style={[estilos.caixa, sombra(1), { backgroundColor: paleta.superficie, borderColor: paleta.borda }]}>
        <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria }]}>
          Nenhuma vaga comum livre agora
        </Text>
        <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
          Toque numa vaga ocupada para ser avisado quando ela liberar.
        </Text>
      </View>
    );
  }

  const { vaga, metros, outrasLivres } = sugestao;

  return (
    <View
      style={[
        estilos.caixa,
        sombra(2),
        { backgroundColor: paleta.superficie, borderColor: paleta.destaque },
      ]}
    >
      <View style={estilos.linhaTopo}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[tipografia.micro, { color: paleta.destaque }]}>MELHOR VAGA AGORA</Text>
          <Pressable onPress={aoAbrirDetalhe} accessibilityRole="button">
            <Text style={[tipografia.display, { color: paleta.tintaPrimaria }]}>{vaga.id}</Text>
          </Pressable>
          <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
            ≈ {metros} m da entrada · fileira {vaga.fileira}
            {outrasLivres > 0
              ? ` · mais ${outrasLivres} livre${outrasLivres > 1 ? 's' : ''}`
              : ' · é a última livre'}
          </Text>
        </View>

        <View style={[estilos.marcador, { backgroundColor: paleta.livre }]}>
          <Text style={[estilos.marcadorTexto, { color: paleta.tintaSobreLivre }]}>P</Text>
        </View>
      </View>

      <Pressable
        onPress={aoAlternarRota}
        accessibilityRole="button"
        style={[
          estilos.botao,
          {
            backgroundColor: rotaVisivel ? paleta.destaque : paleta.destaqueSuave,
            borderColor: paleta.destaque,
          },
        ]}
      >
        <Text
          style={[
            tipografia.subtitulo,
            { color: rotaVisivel ? '#ffffff' : paleta.destaque },
          ]}
        >
          {rotaVisivel ? '✓ Caminho no mapa' : 'Mostrar caminho no mapa'}
        </Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    borderRadius: raio.lg,
    borderWidth: 1,
    padding: espacamento.lg,
    gap: espacamento.md,
  },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', gap: espacamento.md },
  marcador: {
    width: 54,
    height: 54,
    borderRadius: raio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcadorTexto: { fontSize: 26, fontWeight: '800' },
  botao: {
    borderRadius: raio.md,
    borderWidth: 1,
    paddingVertical: espacamento.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
});
