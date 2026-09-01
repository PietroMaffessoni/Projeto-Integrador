import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buscarAnomalias } from '../api/cliente';
import type { Anomalia } from '../api/tipos';
import { Cartao } from '../componentes/Cartao';
import { Selo } from '../componentes/Selo';
import { config } from '../config';
import { usarLoja } from '../estado/loja';
import { usarPreferencias, vibrar } from '../estado/preferencias';
import { espacamento, raio, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';
import { dataHoraCurta } from '../utils/tempo';

const ICONE: Record<Anomalia['tipo'], string> = {
  SENSOR_OSCILANDO: '≈',
  SENSOR_INERTE: '−',
  OCUPACAO_IMPLAUSIVEL: '⏱',
  CONTROLADOR_OFFLINE: '⚡',
};

const TITULO: Record<Anomalia['tipo'], string> = {
  SENSOR_OSCILANDO: 'Sensor oscilando',
  SENSOR_INERTE: 'Sensor sem reagir',
  OCUPACAO_IMPLAUSIVEL: 'Ocupação longa demais',
  CONTROLADOR_OFFLINE: 'Controlador fora do ar',
};

const ROTULO_MODO_TEMA = {
  sistema: 'Segue o sistema',
  claro: 'Sempre claro',
  escuro: 'Sempre escuro',
} as const;

/**
 * Diagnóstico e ajustes.
 *
 * Esta tela é para quem mantém a maquete, não para quem procura vaga: mostra o
 * que o backend concluiu sobre a saúde dos sensores. Numa apresentação, é ela
 * que responde "e se um sensor falhar?" sem depender de ninguém acreditar na
 * resposta.
 */
export function TelaDiagnostico(): React.JSX.Element {
  const { paleta } = usarTema();
  const anomaliasAoVivo = usarLoja((e) => e.anomalias);
  const vagas = usarLoja((e) => e.vagas);
  const vigiadas = usarLoja((e) => e.vigiadas);

  const modoTema = usarPreferencias((e) => e.modoTema);
  const alternarTema = usarPreferencias((e) => e.alternarTema);
  const vibracao = usarPreferencias((e) => e.vibracao);
  const alternarVibracao = usarPreferencias((e) => e.alternarVibracao);

  const [anomalias, setAnomalias] = useState<Anomalia[]>(anomaliasAoVivo);
  const [recarregando, setRecarregando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const resposta = await buscarAnomalias();
      setAnomalias(resposta.anomalias);
    } catch {
      setAnomalias(anomaliasAoVivo);
    }
  }, [anomaliasAoVivo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    setAnomalias(anomaliasAoVivo);
  }, [anomaliasAoVivo]);

  const semSinal = vagas.filter((v) => v.estado === 'OFFLINE').length;

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
      <Cartao
        titulo="Situação"
        acao={
          <Selo
            texto={anomalias.length === 0 ? 'tudo certo' : `${anomalias.length} alerta`}
            cor={anomalias.length === 0 ? paleta.livre : paleta.critico}
            comPonto
          />
        }
      >
        <Linha chave="Backend" valor={config.urlApi} />
        <Linha chave="Vagas reportando" valor={`${vagas.length - semSinal} de ${vagas.length}`} />
        <Linha
          chave="Vagas vigiadas"
          valor={vigiadas.length === 0 ? 'nenhuma' : vigiadas.join(', ')}
        />
      </Cartao>

      <Cartao titulo="Preferências">
        <Opcao
          rotulo="Tema"
          valor={ROTULO_MODO_TEMA[modoTema]}
          aoTocar={() => {
            void vibrar('leve');
            void alternarTema();
          }}
        />
        <Opcao
          rotulo="Vibrar ao tocar e ao avisar"
          valor={vibracao ? 'Ligado' : 'Desligado'}
          aoTocar={() => {
            void alternarVibracao();
            void vibrar('leve');
          }}
        />
      </Cartao>

      {anomalias.length === 0 ? (
        <Cartao>
          <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
            Nenhuma anomalia detectada. Os sensores estão respondendo dentro do esperado e o
            controlador enviou heartbeat nos últimos dois minutos.
          </Text>
        </Cartao>
      ) : (
        anomalias.map((anomalia, indice) => {
          const cor = anomalia.severidade === 'critico' ? paleta.critico : paleta.atencao;
          return (
            <Cartao key={`${anomalia.tipo}-${anomalia.alvo}-${indice}`}>
              <View style={estilos.cabecalhoAnomalia}>
                <View style={[estilos.icone, { borderColor: cor, backgroundColor: `${cor}14` }]}>
                  <Text style={{ color: cor, fontSize: 17, fontWeight: '700' }}>
                    {ICONE[anomalia.tipo]}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria }]}>
                    {TITULO[anomalia.tipo]} · {anomalia.alvo}
                  </Text>
                  <Text style={[tipografia.micro, { color: cor }]}>
                    {anomalia.severidade === 'critico' ? 'CRÍTICO' : 'AVISO'}
                  </Text>
                </View>
              </View>

              <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
                {anomalia.mensagem}
              </Text>
              <View
                style={[
                  estilos.sugestao,
                  { backgroundColor: paleta.superficieSutil, borderColor: paleta.borda },
                ]}
              >
                <Text style={[tipografia.corpo, { color: paleta.tintaPrimaria }]}>
                  O que fazer: {anomalia.sugestao}
                </Text>
              </View>
              <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
                Detectada em {dataHoraCurta(anomalia.detectadaEm)}
              </Text>
            </Cartao>
          );
        })
      )}
    </ScrollView>
  );
}

function Linha({ chave, valor }: { chave: string; valor: string }): React.JSX.Element {
  const { paleta } = usarTema();
  return (
    <View style={estilos.linha}>
      <Text style={[tipografia.corpo, { color: paleta.tintaSuave }]}>{chave}</Text>
      <Text style={[tipografia.corpo, { color: paleta.tintaPrimaria, flex: 1, textAlign: 'right' }]}>
        {valor}
      </Text>
    </View>
  );
}

function Opcao({
  rotulo,
  valor,
  aoTocar,
}: {
  rotulo: string;
  valor: string;
  aoTocar: () => void;
}): React.JSX.Element {
  const { paleta } = usarTema();
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      style={[estilos.opcao, { borderColor: paleta.borda }]}
    >
      <Text style={[tipografia.corpo, { color: paleta.tintaPrimaria, flex: 1 }]}>{rotulo}</Text>
      <Text style={[tipografia.corpo, { color: paleta.destaque }]}>{valor}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: espacamento.lg, gap: espacamento.md, paddingBottom: 120 },
  linha: { flexDirection: 'row', gap: espacamento.md },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.md,
    paddingVertical: espacamento.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  cabecalhoAnomalia: { flexDirection: 'row', alignItems: 'center', gap: espacamento.md },
  icone: {
    width: 38,
    height: 38,
    borderRadius: raio.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sugestao: {
    padding: espacamento.md,
    borderRadius: raio.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
