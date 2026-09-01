import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AvisoConexao } from '../componentes/AvisoConexao';
import { Cartao } from '../componentes/Cartao';
import { Esqueleto } from '../componentes/Esqueleto';
import { FiltroTipoVaga } from '../componentes/FiltroTipoVaga';
import { Legenda } from '../componentes/Legenda';
import { MapaEstacionamento } from '../componentes/MapaEstacionamento';
import { PainelVaga } from '../componentes/PainelVaga';
import { ResumoFileiras } from '../componentes/ResumoFileiras';
import { SugestaoVaga } from '../componentes/SugestaoVaga';
import { usarLoja } from '../estado/loja';
import { vibrar } from '../estado/preferencias';
import { espacamento, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';
import { melhorVaga } from '../utils/sugestao';

/** Frequência com que os textos de "há quanto tempo" são recalculados. */
const INTERVALO_RELOGIO_MS = 30_000;

export function TelaMapa(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { paleta } = usarTema();

  const vagas = usarLoja((e) => e.vagas);
  const situacao = usarLoja((e) => e.situacao);
  const filtro = usarLoja((e) => e.filtro);
  const selecionada = usarLoja((e) => e.vagaSelecionada);
  const vigiadas = usarLoja((e) => e.vigiadas);
  const definirFiltro = usarLoja((e) => e.definirFiltro);
  const selecionar = usarLoja((e) => e.selecionar);
  const recarregar = usarLoja((e) => e.recarregar);
  const alternarVigilancia = usarLoja((e) => e.alternarVigilancia);

  const [recarregando, setRecarregando] = useState(false);
  const [mostrarRota, setMostrarRota] = useState(false);
  const [, setRelogio] = useState(0);

  // O "há 3 min" precisa envelhecer sozinho, sem novo evento do servidor.
  useEffect(() => {
    const temporizador = setInterval(() => setRelogio((n) => n + 1), INTERVALO_RELOGIO_MS);
    return () => clearInterval(temporizador);
  }, []);

  const larguraMapa = Math.min(width - espacamento.lg * 2, 620);
  const sugestao = useMemo(() => melhorVaga(vagas, filtro), [vagas, filtro]);
  const semDados = vagas.length > 0 && vagas.every((v) => v.estado === 'OFFLINE');

  /** Recalcula localmente há quanto tempo a vaga está no estado atual. */
  const vagaEmDetalhe = useMemo(() => {
    const vaga = vagas.find((v) => v.id === selecionada);
    if (!vaga) return null;
    const segundos = vaga.atualizadoEm
      ? Math.max(0, Math.round((Date.now() - new Date(vaga.atualizadoEm).getTime()) / 1000))
      : null;
    return { ...vaga, haSegundos: segundos };
  }, [vagas, selecionada]);

  const carregando = vagas.length === 0 && situacao !== 'sem-conexao';

  return (
    <>
      <ScrollView
        style={{ backgroundColor: paleta.fundo }}
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
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
        <AvisoConexao />

        {carregando ? (
          <>
            <Cartao>
              <Esqueleto altura={46} largura="40%" />
              <Esqueleto altura={14} largura="70%" />
            </Cartao>
            <Cartao>
              <Esqueleto altura={220} />
            </Cartao>
          </>
        ) : (
          <>
            <SugestaoVaga
              sugestao={sugestao}
              rotaVisivel={mostrarRota}
              semDados={semDados || vagas.length === 0}
              aoAlternarRota={() => {
                void vibrar('leve');
                setMostrarRota((atual) => !atual);
              }}
              aoAbrirDetalhe={() => sugestao && selecionar(sugestao.vaga.id)}
            />

            <ResumoFileiras vagas={vagas} />

            <FiltroTipoVaga filtro={filtro} vagas={vagas} aoEscolher={definirFiltro} />

            <View style={estilos.mapa}>
              <MapaEstacionamento
                vagas={vagas}
                filtro={filtro}
                selecionada={selecionada}
                sugerida={sugestao?.vaga.id ?? null}
                mostrarRota={mostrarRota}
                largura={larguraMapa}
                aoTocar={(id) => {
                  void vibrar('leve');
                  selecionar(id);
                }}
              />
            </View>

            <Legenda />

            <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
              Toque numa vaga para ver o histórico. A planta está na escala da maquete: 345 × 305 mm,
              vagas de 40 × 80 mm — os mesmos milímetros da peça impressa.
            </Text>
          </>
        )}
      </ScrollView>

      <PainelVaga
        vaga={vagaEmDetalhe}
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
    paddingBottom: 120,
  },
  mapa: { alignItems: 'center' },
});
