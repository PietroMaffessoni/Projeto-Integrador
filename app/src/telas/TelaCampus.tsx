import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Cartao } from '../componentes/Cartao';
import { MapaCampus } from '../componentes/MapaCampus';
import { PainelZona } from '../componentes/PainelZona';
import { Selo } from '../componentes/Selo';
import { CAPACIDADE_TOTAL_CAMPUS, ZONAS, cobertura, vagasInstrumentadas } from '../dados/campus';
import { usarLoja } from '../estado/loja';
import { vibrar } from '../estado/preferencias';
import { espacamento, raio, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';

/**
 * O campus inteiro, com o piloto ao vivo dentro dele.
 *
 * A tela existe para responder à pergunta que qualquer avaliador faz depois de
 * ver a maquete funcionando: "e para o estacionamento de verdade?". A resposta
 * não é uma promessa em texto — é o mesmo desenho, na mesma arquitetura, com um
 * setor já medindo e cinco esperando sensores.
 */
export function TelaCampus({ aoIrParaMaquete }: { aoIrParaMaquete: () => void }): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { paleta } = usarTema();
  const vagas = usarLoja((e) => e.vagas);
  const [zonaSelecionada, setZonaSelecionada] = useState<string | null>(null);

  const livres = vagas.filter((v) => v.estado === 'LIVRE').length;
  const ocupadas = vagas.filter((v) => v.estado === 'OCUPADA').length;
  const semSinal = vagas.filter((v) => v.estado === 'OFFLINE').length;
  const todasSemSinal = vagas.length > 0 && semSinal === vagas.length;

  const larguraMapa = Math.min(width - espacamento.lg * 2, 620);
  const zona = ZONAS.find((z) => z.id === zonaSelecionada) ?? null;
  const percentual = cobertura() * 100;

  return (
    <>
      <ScrollView
        style={{ backgroundColor: paleta.fundo }}
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
      >
        <Cartao
          titulo="Campus São Caetano do Sul"
          subtitulo="Praça Mauá, 1 — planta esquemática"
          acao={<Selo texto="prévia" discreto />}
        >
          <View style={estilos.numeros}>
            <View style={{ flex: 1 }}>
              <Text style={[tipografia.numeroHeroi, { color: paleta.tintaPrimaria }]}>
                {vagasInstrumentadas()}
              </Text>
              <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
                vagas instrumentadas de{' '}
                <Text style={{ fontWeight: '700' }}>
                  {CAPACIDADE_TOTAL_CAMPUS.toLocaleString('pt-BR')}
                </Text>{' '}
                do campus
              </Text>
            </View>
          </View>

          <View style={[estilos.trilho, { backgroundColor: paleta.superficieSutil }]}>
            <View
              style={[
                estilos.preenchimento,
                { width: `${Math.max(percentual, 1.2)}%`, backgroundColor: paleta.destaque },
              ]}
            />
          </View>
          <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
            {percentual.toFixed(1)}% do estacionamento coberto por sensores — o setor-piloto deste
            projeto.
          </Text>
        </Cartao>

        <View style={estilos.mapa}>
          <MapaCampus
            largura={larguraMapa}
            selecionada={zonaSelecionada}
            livresNoPiloto={livres}
            semSinalNoPiloto={todasSemSinal || vagas.length === 0}
            aoTocar={(id) => {
              void vibrar('leve');
              setZonaSelecionada(id === 'portaria' ? null : id);
            }}
          />
        </View>

        <View style={estilos.legenda}>
          <View style={estilos.itemLegenda}>
            <View style={[estilos.amostra, { backgroundColor: paleta.livre, borderColor: paleta.destaque, borderWidth: 2 }]} />
            <Text style={[tipografia.legenda, { color: paleta.tintaSecundaria }]}>
              Medido por sensores
            </Text>
          </View>
          <View style={estilos.itemLegenda}>
            <View style={[estilos.amostra, { backgroundColor: paleta.semSensor, borderColor: paleta.borda, borderWidth: 1 }]} />
            <Text style={[tipografia.legenda, { color: paleta.tintaSecundaria }]}>
              Ainda sem sensores
            </Text>
          </View>
        </View>

        {/* Alternativa em lista ao desenho — some the same data, legível por
            leitor de tela e sem depender de enxergar o mapa. */}
        <Cartao titulo="Setores" subtitulo="Toque para ver o detalhe">
          {ZONAS.map((z) => {
            const aoVivo = z.situacao === 'ao-vivo';
            return (
              <Pressable
                key={z.id}
                onPress={() => {
                  void vibrar('leve');
                  setZonaSelecionada(z.id);
                }}
                accessibilityRole="button"
                style={[estilos.linhaZona, { borderColor: paleta.borda }]}
              >
                <View
                  style={[
                    estilos.marcadorZona,
                    {
                      backgroundColor: aoVivo ? paleta.livre : paleta.semSensor,
                      borderColor: aoVivo ? paleta.destaque : paleta.borda,
                    },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[tipografia.corpo, { color: paleta.tintaPrimaria }]}>{z.nome}</Text>
                  <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
                    {aoVivo
                      ? `${livres} livres · ${ocupadas} ocupadas${semSinal ? ` · ${semSinal} sem sinal` : ''}`
                      : `≈ ${z.vagas} vagas · sem medição`}
                  </Text>
                </View>
                <Text style={{ color: paleta.tintaSuave, fontSize: 18 }}>›</Text>
              </Pressable>
            );
          })}
        </Cartao>

        <Cartao titulo="O que esta tela é — e o que não é">
          <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
            O desenho representa a organização do campus, não a topografia exata. As capacidades por
            setor são estimativas derivadas do número divulgado pelo Instituto —{' '}
            {CAPACIDADE_TOTAL_CAMPUS.toLocaleString('pt-BR')} vagas gratuitas — e estão marcadas
            como tal em todo lugar onde aparecem.
          </Text>
          <Text style={[tipografia.corpo, { color: paleta.tintaSecundaria }]}>
            O que não é estimativa é o setor-piloto: aquelas 16 vagas existem, têm sensor e chegam
            aqui pelo mesmo backend que alimenta o mapa da maquete. Instrumentar o resto do campus
            não muda uma linha de código — muda a quantidade de placas publicando no mesmo tópico
            MQTT.
          </Text>
        </Cartao>
      </ScrollView>

      <PainelZona
        zona={zona}
        livresNoPiloto={livres}
        ocupadasNoPiloto={ocupadas}
        semSinalNoPiloto={semSinal}
        aoFechar={() => setZonaSelecionada(null)}
        aoVerMaquete={() => {
          setZonaSelecionada(null);
          aoIrParaMaquete();
        }}
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
  numeros: { flexDirection: 'row', alignItems: 'center', gap: espacamento.md },
  trilho: { height: 8, borderRadius: 4, overflow: 'hidden' },
  preenchimento: { height: 8, borderRadius: 4 },
  mapa: { alignItems: 'center' },
  legenda: { flexDirection: 'row', gap: espacamento.lg, flexWrap: 'wrap' },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: espacamento.sm },
  amostra: { width: 20, height: 20, borderRadius: 5 },
  linhaZona: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.md,
    paddingVertical: espacamento.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  marcadorZona: { width: 14, height: 26, borderRadius: 4 },
});
