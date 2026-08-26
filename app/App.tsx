import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { usarLoja } from './src/estado/loja';
import { prepararNotificacoes } from './src/notificacoes';
import { TelaDiagnostico } from './src/telas/TelaDiagnostico';
import { TelaEstatisticas } from './src/telas/TelaEstatisticas';
import { TelaMapa } from './src/telas/TelaMapa';
import { espacamento, paletaDe, tipografia } from './src/tema';

type Aba = 'mapa' | 'estatisticas' | 'diagnostico';

const ABAS: Array<{ id: Aba; rotulo: string; icone: string }> = [
  { id: 'mapa', rotulo: 'Mapa', icone: '▦' },
  { id: 'estatisticas', rotulo: 'Ocupação', icone: '◫' },
  { id: 'diagnostico', rotulo: 'Sensores', icone: '⚙' },
];

/**
 * `SafeAreaView` só funciona dentro de um `SafeAreaProvider` — sem ele, o
 * componente não encontra os valores de área segura e derruba o app na abertura.
 */
export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <Aplicativo />
    </SafeAreaProvider>
  );
}

function Aplicativo(): React.JSX.Element {
  const esquemaDoSistema = useColorScheme();
  const paleta = useMemo(
    () => paletaDe(esquemaDoSistema === 'dark' ? 'escuro' : 'claro'),
    [esquemaDoSistema],
  );

  const [aba, setAba] = useState<Aba>('mapa');
  const conectar = usarLoja((e) => e.conectar);
  const desconectar = usarLoja((e) => e.desconectar);
  const anomalias = usarLoja((e) => e.anomalias);

  useEffect(() => {
    void conectar();
    void prepararNotificacoes();
    return () => desconectar();
  }, [conectar, desconectar]);

  return (
    <SafeAreaView style={[estilos.raiz, { backgroundColor: paleta.fundo }]}>
      <StatusBar style={esquemaDoSistema === 'dark' ? 'light' : 'dark'} />

      <View style={estilos.cabecalho}>
        <Text style={[tipografia.titulo, { color: paleta.tintaPrimaria }]}>Vagas · Mauá</Text>
        <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
          Estacionamento monitorado em tempo real
        </Text>
      </View>

      <View style={estilos.conteudo}>
        {aba === 'mapa' && <TelaMapa paleta={paleta} />}
        {aba === 'estatisticas' && <TelaEstatisticas paleta={paleta} />}
        {aba === 'diagnostico' && <TelaDiagnostico paleta={paleta} />}
      </View>

      <View style={[estilos.abas, { backgroundColor: paleta.superficie, borderTopColor: paleta.borda }]}>
        {ABAS.map(({ id, rotulo, icone }) => {
          const ativa = aba === id;
          const comAlerta = id === 'diagnostico' && anomalias.length > 0;

          return (
            <Pressable
              key={id}
              onPress={() => setAba(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativa }}
              style={estilos.aba}
            >
              <View>
                <Text style={{ fontSize: 18, color: ativa ? paleta.destaque : paleta.tintaSuave }}>
                  {icone}
                </Text>
                {comAlerta && <View style={[estilos.selo, { backgroundColor: paleta.critico }]} />}
              </View>
              <Text
                style={[
                  tipografia.legenda,
                  { color: ativa ? paleta.destaque : paleta.tintaSuave },
                ]}
              >
                {rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  cabecalho: {
    paddingHorizontal: espacamento.lg,
    paddingTop: Platform.OS === 'android' ? espacamento.md : espacamento.xs,
    paddingBottom: espacamento.sm,
  },
  conteudo: { flex: 1 },
  abas: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: espacamento.sm,
    paddingBottom: espacamento.sm,
  },
  aba: { flex: 1, alignItems: 'center', gap: 2, minHeight: 48, justifyContent: 'center' },
  selo: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
