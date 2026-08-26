import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BarraSituacao } from '../componentes/BarraSituacao';
import { FiltroTipoVaga } from '../componentes/FiltroTipoVaga';
import { Legenda } from '../componentes/Legenda';
import { MapaEstacionamento } from '../componentes/MapaEstacionamento';
import { PainelVaga } from '../componentes/PainelVaga';
import { ResumoFileiras } from '../componentes/ResumoFileiras';
import { usarLoja } from '../estado/loja';
import { espacamento, tipografia, type Paleta_ } from '../tema';

/** Frequência com que os textos de "há quanto tempo" são recalculados. */
const INTERVALO_RELOGIO_MS = 30_000;

export function TelaMapa({ paleta }: { paleta: Paleta_ }): React.JSX.Element {
  const { width } = useWindowDimensions();
  const vagas = usarLoja((e) => e.vagas);
  const situacao = usarLoja((e) => e.situacao);
  const erro = usarLoja((e) => e.erro);
  const filtro = usarLoja((e) => e.filtro);
  const selecionada = usarLoja((e) => e.vagaSelecionada);
  const vigiadas = usarLoja((e) => e.vigiadas);
  const definirFiltro = usarLoja((e) => e.definirFiltro);
  const selecionar = usarLoja((e) => e.selecionar);
  const recarregar = usarLoja((e) => e.recarregar);
  const alternarVigilancia = usarLoja((e) => e.alternarVigilancia);

  const [recarregando, setRecarregando] = useState(false);
  const [, setRelogio] = useState(0);

  // O "há 3 min" precisa envelhecer sozinho, sem novo evento do servidor.
  useEffect(() => {
    const temporizador = setInterval(() => setRelogio((n) => n + 1), INTERVALO_RELOGIO_MS);
    return () => clearInterval(temporizador);
  }, []);

  const larguraMapa = Math.min(width - espacamento.lg * 2, 560);

  /** Recalcula localmente há quanto tempo a vaga está no estado atual. */
  const vagaEmDetalhe = useMemo(() => {
    const vaga = vagas.find((v) => v.id === selecionada);
    if (!vaga) return null;
    const segundos = vaga.atualizadoEm
      ? Math.max(0, Math.round((Date.now() - new Date(vaga.atualizadoEm).getTime()) / 1000))
      : null;
    return { ...vaga, haSegundos: segundos };
  }, [vagas, selecionada]);

  return (
    <>
      <ScrollView
        style={{ backgroundColor: paleta.fundo }}
        contentContainerStyle={estilos.conteudo}
        refreshControl={
          <RefreshControl
            refreshing={recarregando}
            onRefresh={async () => {
              setRecarregando(true);
              await recarregar();
              setRecarregando(false);
            }}
            tintColor={paleta.tintaSuave}
          />
        }
      >
        <BarraSituacao
          situacao={situacao}
          erro={erro}
          paleta={paleta}
          aoTentarNovamente={() => void recarregar()}
        />

        <ResumoFileiras vagas={vagas} paleta={paleta} />

        <FiltroTipoVaga
          filtro={filtro}
          vagas={vagas}
          paleta={paleta}
          aoEscolher={definirFiltro}
        />

        {vagas.length === 0 ? (
          <View style={estilos.vazio}>
            <Text style={[tipografia.corpo, { color: paleta.tintaSuave, textAlign: 'center' }]}>
              {situacao === 'sem-conexao'
                ? 'Sem dados do backend. Verifique se ele está no ar e na mesma rede.'
                : 'Carregando as vagas…'}
            </Text>
          </View>
        ) : (
          <View style={estilos.mapa}>
            <MapaEstacionamento
              vagas={vagas}
              filtro={filtro}
              selecionada={selecionada}
              paleta={paleta}
              largura={larguraMapa}
              aoTocar={selecionar}
            />
          </View>
        )}

        <Legenda paleta={paleta} />

        <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
          Toque numa vaga para ver o histórico. A planta está na escala da maquete:
          345 × 305 mm, vagas de 40 × 80 mm.
        </Text>
      </ScrollView>

      <PainelVaga
        vaga={vagaEmDetalhe}
        paleta={paleta}
        vigiada={vagaEmDetalhe ? vigiadas.includes(vagaEmDetalhe.id) : false}
        aoFechar={() => selecionar(null)}
        aoAlternarVigilancia={(id) => void alternarVigilancia(id)}
      />
    </>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espacamento.lg,
    gap: espacamento.md,
    paddingBottom: espacamento.xl * 2,
  },
  mapa: { alignItems: 'center' },
  vazio: { paddingVertical: espacamento.xl * 2 },
});
