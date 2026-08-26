import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Defs, G, Line, Path, Pattern, Rect, Text as TextoSvg } from 'react-native-svg';
import type { Vaga } from '../api/tipos';
import type { FiltroTipo } from '../estado/loja';
import { coresDoEstado, type Paleta_ } from '../tema';

/**
 * Planta do estacionamento em **milímetros da maquete**.
 *
 * O `viewBox` é literalmente a placa de 345 × 305 mm descrita na seção 4 do
 * CLAUDE.md: 8 vagas de 40 × 80 mm por fileira, corredor de 95 mm, calçada de
 * 25 mm em três lados. Desenhar na mesma unidade da peça física significa que
 * qualquer medida conferida na maquete com um paquímetro bate com o mapa — e
 * que mudar a maquete é mudar uma constante aqui, não redesenhar o SVG.
 */
const MM = {
  placaLargura: 345,
  placaAltura: 305,
  calcada: 25,
  vagaLargura: 40,
  vagaProfundidade: 80,
  corredor: 95,
  faixa: 2,
  vagasPorFileira: 8,
} as const;

const Y_FILEIRA_A = MM.calcada;
const Y_CORREDOR = Y_FILEIRA_A + MM.vagaProfundidade;
const Y_FILEIRA_B = Y_CORREDOR + MM.corredor;
const X_PRIMEIRA_VAGA = MM.calcada;

/** A numeração cresce do fundo em direção à entrada: A1 é a mais distante. */
function xDaVaga(posicao: number): number {
  return X_PRIMEIRA_VAGA + (posicao - 1) * MM.vagaLargura;
}

function yDaFileira(fileira: string): number {
  return fileira === 'A' ? Y_FILEIRA_A : Y_FILEIRA_B;
}

const ROTULO_TIPO: Record<string, string> = { PCD: 'PCD', IDOSO: '60+' };

interface Props {
  vagas: Vaga[];
  filtro: FiltroTipo;
  selecionada: string | null;
  paleta: Paleta_;
  aoTocar: (vagaId: string) => void;
  largura: number;
}

function MapaBase({ vagas, filtro, selecionada, paleta, aoTocar, largura }: Props): React.JSX.Element {
  const altura = (largura * MM.placaAltura) / MM.placaLargura;

  return (
    <View accessible accessibilityLabel="Planta do estacionamento com 16 vagas">
      <Svg width={largura} height={altura} viewBox={`0 0 ${MM.placaLargura} ${MM.placaAltura}`}>
        <Defs>
          {/* Segundo indicador de "ocupada", para quem não distingue a cor. */}
          <Pattern id="hachura" width={6} height={6} patternUnits="userSpaceOnUse">
            <Path d="M0 6 L6 0" stroke={paleta.hachura} strokeWidth={1.6} />
            <Path d="M-1.5 1.5 L1.5 -1.5" stroke={paleta.hachura} strokeWidth={1.6} />
            <Path d="M4.5 7.5 L7.5 4.5" stroke={paleta.hachura} strokeWidth={1.6} />
          </Pattern>
          {/* "Sem informação" é pontilhado: ausência, não estado. */}
          <Pattern id="pontilhado" width={6} height={6} patternUnits="userSpaceOnUse">
            <Rect x={1.2} y={1.2} width={1.6} height={1.6} rx={0.8} fill={paleta.pontilhado} />
          </Pattern>
        </Defs>

        {/* Piso: calçada em três lados, asfalto no miolo */}
        <Rect x={0} y={0} width={MM.placaLargura} height={MM.placaAltura} fill={paleta.calcada} />
        <Rect
          x={MM.calcada}
          y={MM.calcada}
          width={MM.placaLargura - MM.calcada}
          height={MM.placaAltura - MM.calcada * 2}
          fill={paleta.asfalto}
        />

        {/* Corredor central de mão dupla */}
        <Line
          x1={MM.calcada + 4}
          y1={Y_CORREDOR + MM.corredor / 2}
          x2={MM.placaLargura - 4}
          y2={Y_CORREDOR + MM.corredor / 2}
          stroke={paleta.faixa}
          strokeWidth={1.2}
          strokeDasharray="10 7"
          opacity={0.75}
        />

        {/* Entrada de veículos, na extremidade oposta à calçada de fundo */}
        <G>
          <Path
            d={`M${MM.placaLargura - 4} ${Y_CORREDOR + MM.corredor / 2 - 14}
                l -13 8 l 13 8 z`}
            fill={paleta.destaque}
          />
          <TextoSvg
            x={MM.placaLargura - 6}
            y={Y_CORREDOR + MM.corredor / 2 + 16}
            fill={paleta.tintaSecundaria}
            fontSize={9}
            fontWeight="600"
            textAnchor="end"
          >
            ENTRADA
          </TextoSvg>
        </G>

        {vagas.map((vaga) => {
          const x = xDaVaga(vaga.posicao);
          const y = yDaFileira(vaga.fileira);
          const cores = coresDoEstado(paleta, vaga.estado);
          const filtrada = filtro !== 'TODAS' && vaga.tipo !== filtro;
          const escolhida = selecionada === vaga.id;

          return (
            <G key={vaga.id} onPress={() => aoTocar(vaga.id)} opacity={filtrada ? 0.22 : 1}>
              <Rect
                x={x + MM.faixa / 2}
                y={y}
                width={MM.vagaLargura - MM.faixa}
                height={MM.vagaProfundidade}
                fill={cores.fundo}
                rx={1.5}
              />

              {/* Textura: a informação que sobrevive ao daltonismo */}
              {vaga.estado === 'OCUPADA' && (
                <Rect
                  x={x + MM.faixa / 2}
                  y={y}
                  width={MM.vagaLargura - MM.faixa}
                  height={MM.vagaProfundidade}
                  fill="url(#hachura)"
                  rx={1.5}
                />
              )}
              {vaga.estado === 'OFFLINE' && (
                <Rect
                  x={x + MM.faixa / 2}
                  y={y}
                  width={MM.vagaLargura - MM.faixa}
                  height={MM.vagaProfundidade}
                  fill="url(#pontilhado)"
                  rx={1.5}
                />
              )}

              {escolhida && (
                <Rect
                  x={x + MM.faixa / 2}
                  y={y}
                  width={MM.vagaLargura - MM.faixa}
                  height={MM.vagaProfundidade}
                  fill="none"
                  stroke={paleta.destaque}
                  strokeWidth={3}
                  rx={1.5}
                />
              )}

              <TextoSvg
                x={x + MM.vagaLargura / 2}
                y={y + MM.vagaProfundidade / 2 + 1}
                fill={cores.tinta}
                fontSize={16}
                fontWeight="700"
                textAnchor="middle"
              >
                {vaga.id}
              </TextoSvg>

              {ROTULO_TIPO[vaga.tipo] && (
                <TextoSvg
                  x={x + MM.vagaLargura / 2}
                  y={y + MM.vagaProfundidade / 2 + 15}
                  fill={cores.tinta}
                  fontSize={9}
                  fontWeight="600"
                  textAnchor="middle"
                  opacity={0.9}
                >
                  {ROTULO_TIPO[vaga.tipo]}
                </TextoSvg>
              )}
            </G>
          );
        })}

        {/* Faixas demarcatórias de 2 mm: vagas vizinhas são encostadas e
            compartilham a faixa entre elas, como na peça impressa. */}
        {Array.from({ length: MM.vagasPorFileira + 1 }, (_, i) => {
          const x = X_PRIMEIRA_VAGA + i * MM.vagaLargura;
          return (
            <G key={`faixa-${i}`}>
              <Rect x={x - MM.faixa / 2} y={Y_FILEIRA_A} width={MM.faixa} height={MM.vagaProfundidade} fill={paleta.faixa} opacity={0.9} />
              <Rect x={x - MM.faixa / 2} y={Y_FILEIRA_B} width={MM.faixa} height={MM.vagaProfundidade} fill={paleta.faixa} opacity={0.9} />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

/** O mapa só redesenha quando algo que ele mostra muda. */
export const MapaEstacionamento = memo(MapaBase, (anterior, proximo) => {
  if (
    anterior.filtro !== proximo.filtro ||
    anterior.selecionada !== proximo.selecionada ||
    anterior.largura !== proximo.largura ||
    anterior.paleta !== proximo.paleta ||
    anterior.vagas.length !== proximo.vagas.length
  ) {
    return false;
  }
  return anterior.vagas.every((vaga, i) => vaga.estado === proximo.vagas[i]?.estado);
});
