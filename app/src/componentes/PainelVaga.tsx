import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buscarHistorico } from '../api/cliente';
import type { EventoHistorico, Vaga } from '../api/tipos';
import { vibrar } from '../estado/preferencias';
import { ICONE_ESTADO, ROTULO_ESTADO, coresDoEstado, espacamento, raio, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';
import { dataHoraCurta, tempoRelativo } from '../utils/tempo';
import { Esqueleto } from './Esqueleto';
import { FolhaInferior } from './FolhaInferior';
import { LinhaDoTempo } from './LinhaDoTempo';

interface Props {
  vaga: Vaga | null;
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
  vigiada,
  aoFechar,
  aoAlternarVigilancia,
}: Props): React.JSX.Element {
  const { paleta } = usarTema();
  const [historico, setHistorico] = useState<EventoHistorico[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!vaga) return;
    let cancelado = false;

    setCarregando(true);
    buscarHistorico(vaga.id, 12)
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

  const cores = vaga ? coresDoEstado(paleta, vaga.estado) : null;

  return (
    <FolhaInferior visivel={vaga !== null} aoFechar={aoFechar}>
      {vaga && cores && (
        <>
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
              onPress={() => {
                void vibrar(vigiada ? 'leve' : 'sucesso');
                aoAlternarVigilancia(vaga.id);
              }}
              accessibilityRole="button"
              style={[
                estilos.botao,
                {
                  backgroundColor: vigiada ? paleta.destaque : paleta.destaqueSuave,
                  borderColor: paleta.destaque,
                },
              ]}
            >
              <Text
                style={[tipografia.subtitulo, { color: vigiada ? '#ffffff' : paleta.destaque }]}
              >
                {vigiada ? '✓ Avisando quando liberar' : '🔔 Avisar quando liberar'}
              </Text>
            </Pressable>
          )}

          <View style={estilos.secao}>
            <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria }]}>
              Como esta vaga passou o dia
            </Text>
            {carregando ? <Esqueleto altura={14} /> : <LinhaDoTempo eventos={historico} />}
          </View>

          <View style={estilos.secao}>
            <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria }]}>
              Últimas mudanças
            </Text>
            <ScrollView style={estilos.historico}>
              {carregando && (
                <View style={{ gap: espacamento.sm }}>
                  <Esqueleto altura={16} />
                  <Esqueleto altura={16} largura="80%" />
                </View>
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
                      {ROTULO_ESTADO[evento.estado]}
                    </Text>
                    <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
                      {dataHoraCurta(evento.ocorridoEm)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          <Pressable onPress={aoFechar} style={[estilos.botao, { borderColor: paleta.borda }]}>
            <Text style={[tipografia.subtitulo, { color: paleta.tintaSecundaria }]}>Fechar</Text>
          </Pressable>
        </>
      )}
    </FolhaInferior>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { flexDirection: 'row', gap: espacamento.md, alignItems: 'center' },
  cabecalhoTexto: { flex: 1, gap: 2 },
  selo: {
    width: 60,
    height: 60,
    borderRadius: raio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seloTexto: { fontSize: 22, fontWeight: '800' },
  secao: { gap: espacamento.sm },
  botao: {
    borderWidth: 1,
    borderRadius: raio.md,
    paddingVertical: espacamento.md,
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
  historico: { maxHeight: 180 },
  linhaHistorico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    paddingVertical: espacamento.sm - 1,
  },
  marcador: { width: 10, height: 10, borderRadius: 5 },
});
