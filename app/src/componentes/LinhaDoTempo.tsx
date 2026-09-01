import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { EventoHistorico } from '../api/tipos';
import { coresDoEstado, espacamento, tipografia } from '../tema';
import { usarTema } from '../tema-contexto';
import { horaCurta } from '../utils/tempo';

/**
 * Linha do tempo da vaga: cada faixa é um período, com largura proporcional à
 * duração.
 *
 * É mais honesta que uma lista de eventos porque mostra *quanto tempo* a vaga
 * passou em cada estado — a informação que a lista esconde, e que é justamente a
 * que revela um sensor preso ou uma vaga que nunca vira.
 */
export function LinhaDoTempo({ eventos }: { eventos: EventoHistorico[] }): React.JSX.Element {
  const { paleta } = usarTema();

  if (eventos.length === 0) {
    return (
      <Text style={[tipografia.corpo, { color: paleta.tintaSuave }]}>
        Nenhuma mudança registrada ainda.
      </Text>
    );
  }

  const agora = Date.now();
  const emOrdem = [...eventos].reverse(); // a API devolve do mais novo ao mais antigo
  const inicio = new Date(emOrdem[0]!.ocorridoEm).getTime();
  const total = Math.max(agora - inicio, 1);

  const faixas = emOrdem.map((evento, i) => {
    const comeco = new Date(evento.ocorridoEm).getTime();
    const fim = emOrdem[i + 1] ? new Date(emOrdem[i + 1]!.ocorridoEm).getTime() : agora;
    return { estado: evento.estado, duracao: Math.max(fim - comeco, 1) };
  });

  return (
    <View style={estilos.bloco}>
      <View style={[estilos.trilho, { backgroundColor: paleta.superficieSutil }]}>
        {faixas.map((faixa, i) => (
          <View
            key={i}
            style={{
              flex: faixa.duracao / total,
              backgroundColor: coresDoEstado(paleta, faixa.estado).fundo,
            }}
          />
        ))}
      </View>

      <View style={estilos.rodape}>
        <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>
          {horaCurta(emOrdem[0]!.ocorridoEm)}
        </Text>
        <Text style={[tipografia.legenda, { color: paleta.tintaSuave }]}>agora</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: espacamento.xs },
  trilho: { flexDirection: 'row', height: 14, borderRadius: 4, overflow: 'hidden' },
  rodape: { flexDirection: 'row', justifyContent: 'space-between' },
});
