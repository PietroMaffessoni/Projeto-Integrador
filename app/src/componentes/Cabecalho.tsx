import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usarLoja, type SituacaoConexao } from '../estado/loja';
import { usarPreferencias, vibrar } from '../estado/preferencias';
import { espacamento, raio, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';
import { Selo } from './Selo';

const TEXTO_CONEXAO: Record<SituacaoConexao, string> = {
  conectando: 'conectando',
  'ao-vivo': 'ao vivo',
  reconectando: 'reconectando',
  'sem-conexao': 'sem conexão',
};

const ICONE_TEMA = { sistema: '◐', claro: '☀', escuro: '☾' } as const;
const TITULO_TEMA = { sistema: 'tema do sistema', claro: 'tema claro', escuro: 'tema escuro' } as const;

interface Props {
  titulo: string;
  subtitulo: string;
}

/**
 * Cabeçalho fixo com o estado da conexão sempre à vista.
 *
 * Um app de tempo real que perde a conexão e continua mostrando os últimos dados
 * como se fossem atuais é pior do que um que avisa — por isso o indicador é
 * permanente, e não um alerta que aparece e some.
 */
export function Cabecalho({ titulo, subtitulo }: Props): React.JSX.Element {
  const { paleta } = usarTema();
  const situacao = usarLoja((e) => e.situacao);
  const modoTema = usarPreferencias((e) => e.modoTema);
  const alternarTema = usarPreferencias((e) => e.alternarTema);

  const cor =
    situacao === 'ao-vivo'
      ? paleta.livre
      : situacao === 'sem-conexao'
        ? paleta.critico
        : paleta.atencao;

  return (
    <View style={estilos.raiz}>
      <View style={estilos.texto}>
        <Text style={[tipografia.titulo, { color: paleta.tintaPrimaria }]} numberOfLines={1}>
          {titulo}
        </Text>
        <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]} numberOfLines={1}>
          {subtitulo}
        </Text>
      </View>

      <Selo texto={TEXTO_CONEXAO[situacao]} cor={cor} comPonto />

      <Pressable
        onPress={() => {
          void vibrar('leve');
          void alternarTema();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Alternar tema — agora em ${TITULO_TEMA[modoTema]}`}
        style={[estilos.botaoTema, { borderColor: paleta.borda, backgroundColor: paleta.superficie }]}
      >
        <Text style={{ fontSize: 15, color: paleta.tintaSecundaria }}>{ICONE_TEMA[modoTema]}</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    paddingHorizontal: espacamento.lg,
    paddingBottom: espacamento.sm,
    paddingTop: espacamento.xs,
  },
  texto: { flex: 1, gap: 1 },
  botaoTema: {
    width: 36,
    height: 36,
    borderRadius: raio.pilula,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
