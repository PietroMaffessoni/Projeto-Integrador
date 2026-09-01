import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CAPACIDADE_TOTAL_CAMPUS, type ZonaCampus } from '../dados/campus';
import { espacamento, raio, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';
import { FolhaInferior } from './FolhaInferior';
import { Selo } from './Selo';

interface Props {
  zona: ZonaCampus | null;
  livresNoPiloto: number;
  ocupadasNoPiloto: number;
  semSinalNoPiloto: number;
  aoFechar: () => void;
  aoVerMaquete: () => void;
}

/** Detalhe de um setor do campus. */
export function PainelZona({
  zona,
  livresNoPiloto,
  ocupadasNoPiloto,
  semSinalNoPiloto,
  aoFechar,
  aoVerMaquete,
}: Props): React.JSX.Element {
  const { paleta } = usarTema();
  const aoVivo = zona?.situacao === 'ao-vivo';

  return (
    <FolhaInferior visivel={zona !== null} aoFechar={aoFechar}>
      {zona && (
        <>
          <View style={estilos.cabecalho}>
            <View style={estilos.textoCabecalho}>
              <Text style={[tipografia.titulo, { color: paleta.tintaPrimaria }]}>{zona.nome}</Text>
              <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
                {aoVivo
                  ? `${zona.vagas} vagas instrumentadas`
                  : `≈ ${zona.vagas} vagas — capacidade estimada`}
              </Text>
            </View>
            <Selo
              texto={aoVivo ? 'ao vivo' : 'sem sensores'}
              cor={aoVivo ? paleta.livre : paleta.tintaSuave}
              comPonto={aoVivo}
              discreto={!aoVivo}
            />
          </View>

          {aoVivo ? (
            <View style={estilos.contagens}>
              <Contagem rotulo="Livres" valor={livresNoPiloto} cor={paleta.livre} />
              <Contagem rotulo="Ocupadas" valor={ocupadasNoPiloto} cor={paleta.ocupada} />
              <Contagem rotulo="Sem sinal" valor={semSinalNoPiloto} cor={paleta.offline} />
            </View>
          ) : (
            <View
              style={[
                estilos.avisoEstimativa,
                { backgroundColor: paleta.superficieSutil, borderColor: paleta.borda },
              ]}
            >
              <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
                Este setor <Text style={{ fontWeight: '700' }}>ainda não tem sensores</Text>. O
                número acima é uma estimativa a partir da capacidade total divulgada pelo Instituto
                ({CAPACIDADE_TOTAL_CAMPUS.toLocaleString('pt-BR')} veículos) — não é medição.
              </Text>
            </View>
          )}

          <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>{zona.descricao}</Text>

          {aoVivo && (
            <Pressable
              onPress={aoVerMaquete}
              accessibilityRole="button"
              style={[
                estilos.botao,
                { backgroundColor: paleta.destaque, borderColor: paleta.destaque },
              ]}
            >
              <Text style={[tipografia.subtitulo, { color: '#ffffff' }]}>
                Ver as 16 vagas no mapa
              </Text>
            </Pressable>
          )}

          <Pressable onPress={aoFechar} style={[estilos.botao, { borderColor: paleta.borda }]}>
            <Text style={[tipografia.subtitulo, { color: paleta.tintaSecundaria }]}>Fechar</Text>
          </Pressable>
        </>
      )}
    </FolhaInferior>
  );
}

function Contagem({
  rotulo,
  valor,
  cor,
}: {
  rotulo: string;
  valor: number;
  cor: string;
}): React.JSX.Element {
  const { paleta } = usarTema();
  return (
    <View style={[estilos.contagem, { backgroundColor: paleta.superficieSutil, borderColor: paleta.borda }]}>
      <View style={[estilos.pontoContagem, { backgroundColor: cor }]} />
      <Text style={[estilos.numero, { color: paleta.tintaPrimaria }]}>{valor}</Text>
      <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>{rotulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: espacamento.md },
  textoCabecalho: { flex: 1, gap: 2 },
  contagens: { flexDirection: 'row', gap: espacamento.sm },
  contagem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: espacamento.md,
    borderRadius: raio.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pontoContagem: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  numero: { fontSize: 24, fontWeight: '800' },
  avisoEstimativa: {
    padding: espacamento.md,
    borderRadius: raio.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  botao: {
    borderWidth: 1,
    borderRadius: raio.md,
    paddingVertical: espacamento.md,
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
});
