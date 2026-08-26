import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { config } from '../config';
import type { SituacaoConexao } from '../estado/loja';
import { espacamento, raio, tipografia, type Paleta_ } from '../tema';

interface Props {
  situacao: SituacaoConexao;
  erro: string | null;
  paleta: Paleta_;
  aoTentarNovamente: () => void;
}

const TEXTO: Record<SituacaoConexao, string> = {
  conectando: 'Conectando…',
  'ao-vivo': 'Ao vivo',
  reconectando: 'Reconectando…',
  'sem-conexao': 'Sem conexão',
};

/**
 * Diz em que pé está a conexão.
 *
 * Um app de tempo real que perde a conexão e continua mostrando os últimos
 * dados como se fossem atuais é pior do que um que avisa. Aqui o estado da
 * conexão é permanente na tela, não um alerta que some.
 */
export function BarraSituacao({ situacao, erro, paleta, aoTentarNovamente }: Props): React.JSX.Element {
  const cor =
    situacao === 'ao-vivo'
      ? paleta.livre
      : situacao === 'sem-conexao'
        ? paleta.critico
        : paleta.atencao;

  return (
    <View style={estilos.linha}>
      <View style={estilos.esquerda}>
        <View style={[estilos.ponto, { backgroundColor: cor }]} />
        <Text style={[tipografia.legenda, { color: paleta.tintaSecundaria }]}>
          {TEXTO[situacao]}
        </Text>
      </View>

      {situacao === 'sem-conexao' && (
        <Pressable
          onPress={aoTentarNovamente}
          accessibilityRole="button"
          style={[estilos.botao, { borderColor: paleta.borda }]}
        >
          <Text style={[tipografia.legenda, { color: paleta.tintaPrimaria }]}>Tentar de novo</Text>
        </Pressable>
      )}

      {situacao === 'sem-conexao' && erro && (
        <Text style={[tipografia.legenda, estilos.erro, { color: paleta.tintaSuave }]}>
          {config.urlApi}
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    minHeight: 28,
  },
  esquerda: { flexDirection: 'row', alignItems: 'center', gap: espacamento.xs + 2 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  botao: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: raio.sm,
    paddingHorizontal: espacamento.sm,
    paddingVertical: espacamento.xs,
  },
  erro: { flex: 1, textAlign: 'right' },
});
