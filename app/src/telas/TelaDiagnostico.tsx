import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buscarAnomalias } from '../api/cliente';
import type { Anomalia } from '../api/tipos';
import { config } from '../config';
import { usarLoja } from '../estado/loja';
import { espacamento, raio, tipografia, type Paleta_ } from '../tema';
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

/**
 * Diagnóstico do sistema.
 *
 * Esta tela é para quem mantém a maquete, não para quem procura vaga: mostra o
 * que o backend concluiu a partir do histórico sobre a saúde dos sensores. Numa
 * apresentação, é ela que responde "e se um sensor falhar?" sem depender de
 * ninguém acreditar na resposta.
 */
export function TelaDiagnostico({ paleta }: { paleta: Paleta_ }): React.JSX.Element {
  const anomaliasAoVivo = usarLoja((e) => e.anomalias);
  const vagas = usarLoja((e) => e.vagas);
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
      <View style={[estilos.cartao, { backgroundColor: paleta.superficie, borderColor: paleta.borda }]}>
        <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria }]}>Situação</Text>
        <Linha paleta={paleta} chave="Backend" valor={config.urlApi} />
        <Linha
          paleta={paleta}
          chave="Vagas reportando"
          valor={`${vagas.length - semSinal} de ${vagas.length}`}
        />
        <Linha
          paleta={paleta}
          chave="Anomalias ativas"
          valor={anomalias.length === 0 ? 'nenhuma' : String(anomalias.length)}
        />
      </View>

      {anomalias.length === 0 ? (
        <View style={[estilos.cartao, { backgroundColor: paleta.superficie, borderColor: paleta.borda }]}>
          <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
            Nenhuma anomalia detectada. Os sensores estão respondendo dentro do esperado e o
            controlador enviou heartbeat nos últimos dois minutos.
          </Text>
        </View>
      ) : (
        anomalias.map((anomalia, indice) => {
          const cor = anomalia.severidade === 'critico' ? paleta.critico : paleta.atencao;
          return (
            <View
              key={`${anomalia.tipo}-${anomalia.alvo}-${indice}`}
              style={[
                estilos.cartao,
                { backgroundColor: paleta.superficie, borderColor: paleta.borda },
              ]}
            >
              <View style={estilos.cabecalhoAnomalia}>
                <View style={[estilos.icone, { borderColor: cor }]}>
                  <Text style={{ color: cor, fontSize: 16, fontWeight: '700' }}>
                    {ICONE[anomalia.tipo]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[tipografia.subtitulo, { color: paleta.tintaPrimaria }]}>
                    {TITULO[anomalia.tipo]} · {anomalia.alvo}
                  </Text>
                  <Text style={[tipografia.legenda, { color: cor }]}>
                    {anomalia.severidade === 'critico' ? 'Crítico' : 'Aviso'}
                  </Text>
                </View>
              </View>

              <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
                {anomalia.mensagem}
              </Text>
              <Text style={[tipografia.corpo, { color: paleta.tintaPrimaria }]}>
                O que fazer: {anomalia.sugestao}
              </Text>
              <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
                Detectada em {dataHoraCurta(anomalia.detectadaEm)}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function Linha({
  paleta,
  chave,
  valor,
}: {
  paleta: Paleta_;
  chave: string;
  valor: string;
}): React.JSX.Element {
  return (
    <View style={estilos.linha}>
      <Text style={[tipografia.corpo, { color: paleta.tintaSuave }]}>{chave}</Text>
      <Text style={[tipografia.corpo, { color: paleta.tintaPrimaria, flex: 1, textAlign: 'right' }]}>
        {valor}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: espacamento.lg, gap: espacamento.md, paddingBottom: espacamento.xl * 2 },
  cartao: {
    borderRadius: raio.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: espacamento.lg,
    gap: espacamento.sm,
  },
  linha: { flexDirection: 'row', gap: espacamento.md },
  cabecalhoAnomalia: { flexDirection: 'row', alignItems: 'center', gap: espacamento.md },
  icone: {
    width: 36,
    height: 36,
    borderRadius: raio.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
