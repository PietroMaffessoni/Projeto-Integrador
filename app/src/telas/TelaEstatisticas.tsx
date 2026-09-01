import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buscarPrevisao } from '../api/cliente';
import type { Previsao } from '../api/tipos';
import { BarraOcupacao } from '../componentes/BarraOcupacao';
import { Cartao } from '../componentes/Cartao';
import { Esqueleto } from '../componentes/Esqueleto';
import { MapaDeCalor } from '../componentes/MapaDeCalor';
import { Selo } from '../componentes/Selo';
import { usarLoja } from '../estado/loja';
import { espacamento, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';
import { porcentagem } from '../utils/tempo';

export function TelaEstatisticas(): React.JSX.Element {
  const { paleta } = usarTema();
  const vagas = usarLoja((e) => e.vagas);
  const [previsao, setPrevisao] = useState<Previsao | null>(null);
  const [recarregando, setRecarregando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroPrevisao, setErroPrevisao] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setPrevisao(await buscarPrevisao());
      setErroPrevisao(null);
    } catch (erro) {
      setErroPrevisao(erro instanceof Error ? erro.message : 'Falha ao carregar a previsão');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const contar = (lista: typeof vagas) => ({
    LIVRE: lista.filter((v) => v.estado === 'LIVRE').length,
    OCUPADA: lista.filter((v) => v.estado === 'OCUPADA').length,
    OFFLINE: lista.filter((v) => v.estado === 'OFFLINE').length,
  });

  const conhecidas = vagas.filter((v) => v.estado !== 'OFFLINE');
  const taxaAgora =
    conhecidas.length > 0
      ? conhecidas.filter((v) => v.estado === 'OCUPADA').length / conhecidas.length
      : 0;
  const semSinal = vagas.length - conhecidas.length;

  return (
    <ScrollView
      style={{ backgroundColor: paleta.fundo }}
      contentContainerStyle={estilos.conteudo}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={recarregando}
          onRefresh={async () => {
            setRecarregando(true);
            await carregar();
            setRecarregando(false);
          }}
          tintColor={paleta.tintaSuave}
        />
      }
    >
      <Cartao titulo="Agora" acao={<Selo texto="ao vivo" cor={paleta.livre} comPonto />}>
        <View style={estilos.heroi}>
          <Text style={[tipografia.numeroHeroi, { color: paleta.tintaPrimaria }]}>
            {porcentagem(taxaAgora)}
          </Text>
          <Text style={[tipografia.legenda, { color: paleta.tintaSuave, flex: 1 }]}>
            das vagas de que temos notícia estão ocupadas
            {semSinal > 0 ? ` · ${semSinal} sem sinal ficaram de fora da conta` : ''}
          </Text>
        </View>

        <View style={estilos.barras}>
          {(['A', 'B'] as const).map((fileira) => {
            const daFileira = vagas.filter((v) => v.fileira === fileira);
            return (
              <BarraOcupacao
                key={fileira}
                rotulo={`Fileira ${fileira}`}
                contagem={contar(daFileira)}
                total={daFileira.length}
              />
            );
          })}
        </View>
      </Cartao>

      <Cartao
        titulo="Ocupação por faixa horária"
        subtitulo={
          previsao
            ? `Média das últimas ${previsao.janelaDias / 7} semanas, ponderada pelo tempo`
            : undefined
        }
      >
        {carregando && (
          <View style={{ gap: espacamento.sm }}>
            <Esqueleto altura={140} />
            <Esqueleto altura={14} largura="60%" />
          </View>
        )}

        {erroPrevisao && !carregando && (
          <Text style={[tipografia.corpo, { color: paleta.tintaSuave }]}>{erroPrevisao}</Text>
        )}

        {previsao && !previsao.amostragemSuficiente && (
          <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
            Ainda não há histórico suficiente para afirmar nada. O mapa se preenche conforme os
            sensores registrarem movimento — ou depois de rodar `npm run semear-historico` no
            backend, para demonstração.
          </Text>
        )}

        {previsao && previsao.faixas.length > 0 && <MapaDeCalor faixas={previsao.faixas} />}
      </Cartao>

      {previsao && previsao.melhoresHorariosHoje.length > 0 && (
        <Cartao
          titulo="Melhores horários hoje"
          subtitulo="Ocupação esperada — quanto menor, mais fácil achar vaga"
        >
          {previsao.melhoresHorariosHoje.map((faixa) => (
            <View key={faixa.hora} style={estilos.linhaHorario}>
              <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria, width: 56 }]}>
                {String(faixa.hora).padStart(2, '0')}h
              </Text>
              <View style={[estilos.trilhoFino, { backgroundColor: paleta.superficieSutil }]}>
                <View
                  style={[
                    estilos.preenchimentoFino,
                    {
                      width: `${Math.max(3, faixa.taxaOcupacao * 100)}%`,
                      backgroundColor: paleta.destaque,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  tipografia.legenda,
                  { color: paleta.tintaSecundaria, width: 44, textAlign: 'right' },
                ]}
              >
                {porcentagem(faixa.taxaOcupacao)}
              </Text>
            </View>
          ))}
        </Cartao>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: espacamento.lg, gap: espacamento.md, paddingBottom: 120 },
  heroi: { flexDirection: 'row', alignItems: 'center', gap: espacamento.md },
  barras: { gap: espacamento.md },
  linhaHorario: { flexDirection: 'row', alignItems: 'center', gap: espacamento.sm },
  trilhoFino: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  preenchimentoFino: { height: 10, borderRadius: 5 },
});
