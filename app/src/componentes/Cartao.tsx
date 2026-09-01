import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { usarTema } from '../tema-contexto';
import { espacamento, raio, tipografia } from '../tema';

interface Props {
  titulo?: string;
  subtitulo?: string;
  /** Conteúdo alinhado à direita do título — contadores, botões, selos. */
  acao?: React.ReactNode;
  children?: React.ReactNode;
  estilo?: ViewStyle;
  semPreenchimento?: boolean;
}

/** Superfície padrão do app. Um plano acima do fundo, sempre com a mesma borda. */
export function Cartao({
  titulo,
  subtitulo,
  acao,
  children,
  estilo,
  semPreenchimento,
}: Props): React.JSX.Element {
  const { paleta, sombra } = usarTema();

  return (
    <View
      style={[
        estilos.cartao,
        sombra(1),
        {
          backgroundColor: paleta.superficie,
          borderColor: paleta.borda,
          padding: semPreenchimento ? 0 : espacamento.lg,
        },
        estilo,
      ]}
    >
      {(titulo || acao) && (
        <View style={[estilos.cabecalho, semPreenchimento && estilos.cabecalhoInterno]}>
          <View style={estilos.textoCabecalho}>
            {titulo && (
              <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria }]}>{titulo}</Text>
            )}
            {subtitulo && (
              <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>{subtitulo}</Text>
            )}
          </View>
          {acao}
        </View>
      )}
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    borderRadius: raio.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: espacamento.md,
    overflow: 'hidden',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento.md,
  },
  cabecalhoInterno: { paddingHorizontal: espacamento.lg, paddingTop: espacamento.lg },
  textoCabecalho: { flex: 1, gap: 2 },
});
