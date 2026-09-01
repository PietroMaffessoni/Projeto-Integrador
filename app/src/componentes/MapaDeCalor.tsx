import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FaixaPrevisao } from '../api/tipos';
import { espacamento, raio, tipografia, type Paleta } from '../tema';
import { usarTema } from '../tema-contexto';
import { DIAS_SEMANA, porcentagem } from '../utils/tempo';

interface Props {
  faixas: FaixaPrevisao[];
}

const HORAS = Array.from({ length: 24 }, (_, i) => i);
const ALTURA_CELULA = 15;

/**
 * Mapa de calor de ocupação: dias na horizontal, horas na vertical.
 *
 * Encoding **sequencial** — uma única matiz, do claro ao escuro, porque o dado é
 * magnitude contínua (0 a 100% de ocupação). Nada de arco-íris: cores diferentes
 * sugeririam categorias diferentes onde só existe "mais" e "menos".
 *
 * Faixa com pouca observação não é pintada de azul-clarinho como se fosse vazia
 * — ela fica sem preenchimento e com contorno tracejado. A diferença entre
 * "estava livre" e "não sabemos" é a mesma que separa LIVRE de OFFLINE no mapa.
 */
export function MapaDeCalor({ faixas }: Props): React.JSX.Element {
  const { paleta } = usarTema();
  const [selecionada, setSelecionada] = useState<FaixaPrevisao | null>(null);
  const hoje = new Date().getDay();
  const horaAgora = new Date().getHours();

  const porChave = new Map(faixas.map((faixa) => [`${faixa.diaSemana}-${faixa.hora}`, faixa]));

  const corDaTaxa = (taxa: number): string => {
    const rampa = paleta.rampaOcupacao;
    const indice = Math.min(rampa.length - 1, Math.floor(taxa * rampa.length));
    return rampa[indice] ?? rampa[0]!;
  };

  return (
    <View style={estilos.bloco}>
      <View style={estilos.cabecalhoDias}>
        <View style={estilos.colunaHora} />
        {DIAS_SEMANA.map((dia, indice) => (
          <Text
            key={dia}
            style={[
              tipografia.legenda,
              estilos.rotuloDia,
              { color: indice === hoje ? paleta.tintaPrimaria : paleta.tintaSuave },
            ]}
          >
            {dia}
          </Text>
        ))}
      </View>

      {HORAS.map((hora) => (
        <View key={hora} style={estilos.linha}>
          <Text style={[estilos.rotuloHora, { color: paleta.tintaSuave }]}>
            {hora % 3 === 0 ? `${String(hora).padStart(2, '0')}h` : ''}
          </Text>

          {DIAS_SEMANA.map((_, dia) => {
            const faixa = porChave.get(`${dia}-${hora}`);
            const confiavel = faixa && faixa.confianca !== 'baixa';
            const agora = dia === hoje && hora === horaAgora;
            const escolhida =
              selecionada?.diaSemana === dia && selecionada?.hora === hora;

            return (
              <Pressable
                key={`${dia}-${hora}`}
                onPress={() => setSelecionada(faixa ?? null)}
                accessibilityRole="button"
                accessibilityLabel={
                  confiavel
                    ? `${DIAS_SEMANA[dia]} ${hora} horas: ${porcentagem(faixa!.taxaOcupacao)} ocupado`
                    : `${DIAS_SEMANA[dia]} ${hora} horas: sem dados suficientes`
                }
                style={[
                  estilos.celula,
                  {
                    backgroundColor: confiavel ? corDaTaxa(faixa!.taxaOcupacao) : 'transparent',
                    borderColor: escolhida
                      ? paleta.tintaPrimaria
                      : agora
                        ? paleta.destaque
                        : confiavel
                          ? 'transparent'
                          : paleta.borda,
                    borderWidth: escolhida || agora ? 1.5 : confiavel ? 0 : StyleSheet.hairlineWidth,
                    borderStyle: confiavel ? 'solid' : 'dashed',
                  },
                ]}
              />
            );
          })}
        </View>
      ))}

      {/* Readout: substitui o tooltip de hover, que não existe no toque. */}
      <View style={[estilos.leitura, { borderColor: paleta.borda }]}>
        {selecionada ? (
          <Text style={[tipografia.corpo, { color: paleta.tintaPrimaria }]}>
            {DIAS_SEMANA[selecionada.diaSemana]}, {String(selecionada.hora).padStart(2, '0')}h ·{' '}
            <Text style={{ fontWeight: '700' }}>{porcentagem(selecionada.taxaOcupacao)} ocupado</Text>
            <Text style={{ color: paleta.tintaSuave }}>
              {'  '}({Math.round(selecionada.segundosObservados / 3600)} h observadas, confiança{' '}
              {selecionada.confianca})
            </Text>
          </Text>
        ) : (
          <Text style={[tipografia.corpo, { color: paleta.tintaSuave }]}>
            Toque numa faixa para ver o número.
          </Text>
        )}
      </View>

      <EscalaDeCor paleta={paleta} />
    </View>
  );
}

function EscalaDeCor({ paleta }: { paleta: Paleta }): React.JSX.Element {
  return (
    <View style={estilos.escala}>
      <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>vazio</Text>
      {paleta.rampaOcupacao.map((cor) => (
        <View key={cor} style={[estilos.amostraEscala, { backgroundColor: cor }]} />
      ))}
      <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>lotado</Text>
      <View style={[estilos.amostraVazia, { borderColor: paleta.borda }]} />
      <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>sem dados</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: 2 },
  cabecalhoDias: { flexDirection: 'row', gap: 2, marginBottom: espacamento.xs },
  colunaHora: { width: 26 },
  rotuloDia: { flex: 1, textAlign: 'center' },
  linha: { flexDirection: 'row', gap: 2, marginBottom: 2 },
  rotuloHora: { width: 26, fontSize: 10, textAlign: 'right', paddingRight: 4, lineHeight: ALTURA_CELULA },
  celula: { flex: 1, height: ALTURA_CELULA, borderRadius: 3 },
  leitura: {
    marginTop: espacamento.sm,
    padding: espacamento.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: raio.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  escala: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: espacamento.sm,
    flexWrap: 'wrap',
  },
  amostraEscala: { width: 16, height: 10, borderRadius: 2 },
  amostraVazia: {
    width: 16,
    height: 10,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    marginLeft: espacamento.sm,
  },
});
