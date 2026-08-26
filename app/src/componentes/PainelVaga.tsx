import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buscarHistorico } from '../api/cliente';
import type { EventoHistorico, Vaga } from '../api/tipos';
import { ICONE_ESTADO, ROTULO_ESTADO, coresDoEstado, espacamento, raio, tipografia, type Paleta_ } from '../tema';
import { dataHoraCurta, tempoRelativo } from '../utils/tempo';

interface Props {
  vaga: Vaga | null;
  paleta: Paleta_;
  vigiada: boolean;
  aoFechar: () => void;
  aoAlternarVigilancia: (vagaId: string) => void;
}

const ROTULO_TIPO: Record<string, string> = {
  COMUM: 'Vaga comum',
  PCD: 'Vaga reservada — PCD',
  IDOSO: 'Vaga reservada — idoso',
};

/** Detalhe ao tocar numa vaga: estado, há quanto tempo e as últimas mudanças. */
export function PainelVaga({
  vaga,
  paleta,
  vigiada,
  aoFechar,
  aoAlternarVigilancia,
}: Props): React.JSX.Element {
  const [historico, setHistorico] = useState<EventoHistorico[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!vaga) return;
    let cancelado = false;

    setCarregando(true);
    buscarHistorico(vaga.id, 8)
      .then((resposta) => {
        if (!cancelado) setHistorico(resposta.eventos);
      })
      .catch(() => {
        if (!cancelado) setHistorico([]);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [vaga?.id]);

  if (!vaga) return <></>;

  const cores = coresDoEstado(paleta, vaga.estado);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={aoFechar}>
      <Pressable style={estilos.fundo} onPress={aoFechar}>
        {/* Captura o toque para que ele não chegue ao fundo, que fecha o painel. */}
        <Pressable
          style={[estilos.folha, { backgroundColor: paleta.superficieElevada }]}
          onPress={() => {}}
        >
          <View style={[estilos.puxador, { backgroundColor: paleta.borda }]} />

          <View style={estilos.cabecalho}>
            <View style={[estilos.selo, { backgroundColor: cores.fundo }]}>
              <Text style={[estilos.seloTexto, { color: cores.tinta }]}>{vaga.id}</Text>
            </View>
            <View style={estilos.cabecalhoTexto}>
              <Text style={[tipografia.titulo, { color: paleta.tintaPrimaria }]}>
                {ICONE_ESTADO[vaga.estado]} {ROTULO_ESTADO[vaga.estado]}
              </Text>
              <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
                {vaga.estado === 'OFFLINE'
                  ? 'O sensor desta vaga não está reportando'
                  : `Neste estado ${tempoRelativo(vaga.haSegundos)}`}
              </Text>
              <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
                {ROTULO_TIPO[vaga.tipo]} · fileira {vaga.fileira}, posição {vaga.posicao}
              </Text>
            </View>
          </View>

          {vaga.estado === 'OCUPADA' && (
            <Pressable
              onPress={() => aoAlternarVigilancia(vaga.id)}
              accessibilityRole="button"
              style={[
                estilos.botao,
                {
                  backgroundColor: vigiada ? paleta.destaque : 'transparent',
                  borderColor: vigiada ? paleta.destaque : paleta.borda,
                },
              ]}
            >
              <Text
                style={[
                  tipografia.subtitulo,
                  { color: vigiada ? '#ffffff' : paleta.tintaPrimaria },
                ]}
              >
                {vigiada ? '✓ Avisando quando liberar' : 'Avisar quando liberar'}
              </Text>
            </Pressable>
          )}

          <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria, marginTop: espacamento.sm }]}>
            Últimas mudanças
          </Text>

          <ScrollView style={estilos.historico}>
            {carregando && (
              <Text style={[tipografia.corpo, { color: paleta.tintaSuave }]}>Carregando…</Text>
            )}
            {!carregando && historico.length === 0 && (
              <Text style={[tipografia.corpo, { color: paleta.tintaSuave }]}>
                Nenhuma mudança registrada ainda.
              </Text>
            )}
            {historico.map((evento, indice) => {
              const coresEvento = coresDoEstado(paleta, evento.estado);
              return (
                <View key={`${evento.ocorridoEm}-${indice}`} style={estilos.linhaHistorico}>
                  <View style={[estilos.marcador, { backgroundColor: coresEvento.fundo }]} />
                  <Text style={[tipografia.corpo, { color: paleta.tintaPrimaria, flex: 1 }]}>
                    {ICONE_ESTADO[evento.estado]} {ROTULO_ESTADO[evento.estado]}
                  </Text>
                  <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
                    {dataHoraCurta(evento.ocorridoEm)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <Pressable onPress={aoFechar} style={[estilos.botao, { borderColor: paleta.borda }]}>
            <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria }]}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  folha: {
    borderTopLeftRadius: raio.lg + 6,
    borderTopRightRadius: raio.lg + 6,
    padding: espacamento.lg,
    paddingBottom: espacamento.xl + 8,
    gap: espacamento.md,
    maxHeight: '80%',
  },
  puxador: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: espacamento.xs,
  },
  cabecalho: {
    flexDirection: 'row',
    gap: espacamento.md,
    alignItems: 'center',
  },
  cabecalhoTexto: { flex: 1, gap: 2 },
  selo: {
    width: 56,
    height: 56,
    borderRadius: raio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seloTexto: { fontSize: 20, fontWeight: '700' },
  botao: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: raio.md,
    paddingVertical: espacamento.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  historico: { maxHeight: 200 },
  linhaHistorico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    paddingVertical: espacamento.sm,
  },
  marcador: { width: 10, height: 10, borderRadius: 5 },
});
