import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { config } from '../config';
import { usarLoja } from '../estado/loja';
import { espacamento, raio, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';

/**
 * Faixa de erro, visível só quando a conexão caiu.
 *
 * O estado normal já está no cabeçalho; esta faixa aparece para dizer o que
 * fazer, com o endereço que o app está tentando alcançar — que é a informação
 * que resolve 90% dos casos (celular noutra rede, backend parado).
 */
export function AvisoConexao(): React.JSX.Element | null {
  const { paleta } = usarTema();
  const situacao = usarLoja((e) => e.situacao);
  const recarregar = usarLoja((e) => e.recarregar);

  if (situacao !== 'sem-conexao') return null;

  return (
    <View style={[estilos.faixa, { backgroundColor: `${paleta.critico}1a`, borderColor: paleta.critico }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria }]}>
          Sem conexão com o backend
        </Text>
        <Text style={[tipografia.legenda, { color: paleta.tintaSecundaria }]}>
          Tentando {config.urlApi} — confira se ele está no ar e na mesma rede.
        </Text>
      </View>

      <Pressable
        onPress={() => void recarregar()}
        accessibilityRole="button"
        style={[estilos.botao, { borderColor: paleta.critico }]}
      >
        <Text style={[tipografia.legenda, { color: paleta.critico }]}>Tentar</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.md,
    padding: espacamento.md,
    borderRadius: raio.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  botao: {
    borderWidth: 1,
    borderRadius: raio.sm,
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
    minHeight: 38,
    justifyContent: 'center',
  },
});
