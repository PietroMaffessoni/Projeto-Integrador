import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AbasFlutuantes, type DefinicaoAba } from './src/componentes/AbasFlutuantes';
import { Cabecalho } from './src/componentes/Cabecalho';
import { usarLoja } from './src/estado/loja';
import { usarPreferencias } from './src/estado/preferencias';
import { prepararNotificacoes } from './src/notificacoes';
import { TelaCampus } from './src/telas/TelaCampus';
import { TelaDiagnostico } from './src/telas/TelaDiagnostico';
import { TelaEstatisticas } from './src/telas/TelaEstatisticas';
import { TelaMapa } from './src/telas/TelaMapa';
import { ProvedorDeTema, usarTema } from './src/tema-contexto';

type Aba = 'mapa' | 'campus' | 'ocupacao' | 'sensores';

const CABECALHOS: Record<Aba, { titulo: string; subtitulo: string }> = {
  mapa: { titulo: 'Setor-piloto', subtitulo: '16 vagas monitoradas em tempo real' },
  campus: { titulo: 'Campus Mauá', subtitulo: 'São Caetano do Sul · prévia do sistema completo' },
  ocupacao: { titulo: 'Ocupação', subtitulo: 'Agora e o padrão das últimas semanas' },
  sensores: { titulo: 'Sensores', subtitulo: 'Diagnóstico da instalação e preferências' },
};

/**
 * `SafeAreaView` só funciona dentro de um `SafeAreaProvider` — sem ele, o
 * componente não encontra os valores de área segura e derruba o app na abertura.
 */
export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ProvedorDeTema>
        <Aplicativo />
      </ProvedorDeTema>
    </SafeAreaProvider>
  );
}

function Aplicativo(): React.JSX.Element {
  const { paleta, esquema } = usarTema();
  const [aba, setAba] = useState<Aba>('mapa');

  const conectar = usarLoja((e) => e.conectar);
  const desconectar = usarLoja((e) => e.desconectar);
  const anomalias = usarLoja((e) => e.anomalias);
  const carregarPreferencias = usarPreferencias((e) => e.carregar);

  useEffect(() => {
    void carregarPreferencias();
    void conectar();
    void prepararNotificacoes();
    return () => desconectar();
  }, [conectar, desconectar, carregarPreferencias]);

  const abas: ReadonlyArray<DefinicaoAba<Aba>> = [
    { id: 'mapa', rotulo: 'Mapa', icone: '▦' },
    { id: 'campus', rotulo: 'Campus', icone: '⌂' },
    { id: 'ocupacao', rotulo: 'Ocupação', icone: '◫' },
    { id: 'sensores', rotulo: 'Sensores', icone: '⚙', alerta: anomalias.length > 0 },
  ];

  return (
    <SafeAreaView style={[estilos.raiz, { backgroundColor: paleta.fundo }]} edges={['top', 'left', 'right']}>
      <StatusBar style={esquema === 'escuro' ? 'light' : 'dark'} />

      <Cabecalho titulo={CABECALHOS[aba].titulo} subtitulo={CABECALHOS[aba].subtitulo} />

      <View style={estilos.conteudo}>
        {aba === 'mapa' && <TelaMapa />}
        {aba === 'campus' && <TelaCampus aoIrParaMaquete={() => setAba('mapa')} />}
        {aba === 'ocupacao' && <TelaEstatisticas />}
        {aba === 'sensores' && <TelaDiagnostico />}
      </View>

      <AbasFlutuantes abas={abas} ativa={aba} aoTrocar={setAba} />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  conteudo: { flex: 1 },
});
