import React, { memo, useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect, Text as TextoSvg } from 'react-native-svg';
import type { Vaga } from '../api/tipos';
import type { FiltroTipo } from '../estado/loja';
import { coresDoEstado, duracao, type Paleta } from '../tema';
import { usarTema } from '../tema-contexto';

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
const Y_EIXO_CORREDOR = Y_CORREDOR + MM.corredor / 2;

const RetanguloAnimado = Animated.createAnimatedComponent(Rect);
const CirculoAnimado = Animated.createAnimatedComponent(Circle);

/** A numeração cresce do fundo em direção à entrada: A1 é a mais distante. */
function xDaVaga(posicao: number): number {
  return X_PRIMEIRA_VAGA + (posicao - 1) * MM.vagaLargura;
}

function yDaFileira(fileira: string): number {
  return fileira === 'A' ? Y_FILEIRA_A : Y_FILEIRA_B;
}

const ROTULO_TIPO: Record<string, string> = { PCD: 'PCD', IDOSO: '60+' };

interface PropsVaga {
  vaga: Vaga;
  paleta: Paleta;
  apagada: boolean;
  escolhida: boolean;
  sugerida: boolean;
  aoTocar: (id: string) => void;
}

/**
 * Uma vaga no mapa.
 *
 * É um componente próprio para que cada vaga guarde a própria animação: quando o
 * estado muda, um brilho branco aparece e some em menos de um segundo. Sem isso,
 * numa maquete com movimento em várias vagas, o olho não acompanha *qual* delas
 * acabou de mudar.
 */
function VagaNoMapa({ vaga, paleta, apagada, escolhida, sugerida, aoTocar }: PropsVaga): React.JSX.Element {
  const x = xDaVaga(vaga.posicao);
  const y = yDaFileira(vaga.fileira);
  const cores = coresDoEstado(paleta, vaga.estado);
  const largura = MM.vagaLargura - MM.faixa;
  const esquerda = x + MM.faixa / 2;
  const centroX = x + MM.vagaLargura / 2;

  const brilho = useRef(new Animated.Value(0)).current;
  const pulso = useRef(new Animated.Value(0)).current;
  const estadoAnterior = useRef(vaga.estado);

  useEffect(() => {
    if (estadoAnterior.current === vaga.estado) return;
    estadoAnterior.current = vaga.estado;

    brilho.setValue(0.85);
    Animated.timing(brilho, {
      toValue: 0,
      duration: duracao.destaque,
      useNativeDriver: true,
    }).start();
  }, [vaga.estado, brilho]);

  useEffect(() => {
    if (!sugerida) {
      pulso.setValue(0);
      return;
    }
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    animacao.start();
    return () => animacao.stop();
  }, [sugerida, pulso]);

  return (
    <G onPress={() => aoTocar(vaga.id)} opacity={apagada ? 0.2 : 1}>
      <Rect
        x={esquerda}
        y={y}
        width={largura}
        height={MM.vagaProfundidade}
        fill={cores.fundo}
        rx={2}
      />

      {vaga.estado === 'OCUPADA' && (
        <G opacity={0.95}>
          <Rect
            x={esquerda}
            y={y}
            width={largura}
            height={MM.vagaProfundidade}
            fill="url(#hachura)"
            rx={2}
          />
          {/* Silhueta de carro vista de cima: o segundo canal de informação,
              que continua legível para quem não distingue as cores. */}
          <Rect
            x={centroX - 13}
            y={y + 26}
            width={26}
            height={40}
            rx={7}
            fill={paleta.carro}
          />
          <Rect
            x={centroX - 9}
            y={y + 34}
            width={18}
            height={17}
            rx={4}
            fill={cores.fundo}
            opacity={0.55}
          />
        </G>
      )}

      {vaga.estado === 'OFFLINE' && (
        <>
          <Rect
            x={esquerda}
            y={y}
            width={largura}
            height={MM.vagaProfundidade}
            fill="url(#pontilhado)"
            rx={2}
          />
          <TextoSvg
            x={centroX}
            y={y + 56}
            fill={cores.tinta}
            fontSize={20}
            fontWeight="700"
            textAnchor="middle"
            opacity={0.6}
          >
            ?
          </TextoSvg>
        </>
      )}

      <TextoSvg
        x={centroX}
        y={y + 18}
        fill={cores.tinta}
        fontSize={15}
        fontWeight="800"
        textAnchor="middle"
      >
        {vaga.id}
      </TextoSvg>

      {ROTULO_TIPO[vaga.tipo] && (
        <G>
          <Rect
            x={centroX - 11}
            y={y + MM.vagaProfundidade - 13}
            width={22}
            height={10}
            rx={5}
            fill={cores.tinta}
            opacity={0.22}
          />
          <TextoSvg
            x={centroX}
            y={y + MM.vagaProfundidade - 5}
            fill={cores.tinta}
            fontSize={7.5}
            fontWeight="700"
            textAnchor="middle"
          >
            {ROTULO_TIPO[vaga.tipo]}
          </TextoSvg>
        </G>
      )}

      {/* Brilho da mudança recente */}
      <RetanguloAnimado
        x={esquerda}
        y={y}
        width={largura}
        height={MM.vagaProfundidade}
        rx={2}
        fill="#ffffff"
        opacity={brilho}
        pointerEvents="none"
      />

      {sugerida && (
        <CirculoAnimado
          cx={centroX}
          cy={y + MM.vagaProfundidade / 2}
          r={20}
          fill="none"
          stroke={paleta.destaque}
          strokeWidth={2.5}
          opacity={pulso}
          pointerEvents="none"
        />
      )}

      {escolhida && (
        <Rect
          x={esquerda}
          y={y}
          width={largura}
          height={MM.vagaProfundidade}
          fill="none"
          stroke={paleta.destaque}
          strokeWidth={3}
          rx={2}
        />
      )}
    </G>
  );
}

interface Props {
  vagas: Vaga[];
  filtro: FiltroTipo;
  selecionada: string | null;
  /** Vaga sugerida pelo app — recebe pulso e rota desde a entrada. */
  sugerida: string | null;
  mostrarRota: boolean;
  aoTocar: (vagaId: string) => void;
  largura: number;
}

function MapaBase({
  vagas,
  filtro,
  selecionada,
  sugerida,
  mostrarRota,
  aoTocar,
  largura,
}: Props): React.JSX.Element {
  const { paleta } = usarTema();
  const altura = (largura * MM.placaAltura) / MM.placaLargura;

  const vagaSugerida = vagas.find((v) => v.id === sugerida);
  const rota = mostrarRota && vagaSugerida ? caminhoAteAVaga(vagaSugerida) : null;

  return (
    <View accessible accessibilityLabel="Planta do estacionamento com 16 vagas">
      <Svg width={largura} height={altura} viewBox={`0 0 ${MM.placaLargura} ${MM.placaAltura}`}>
        <Defs>
          <Pattern id="hachura" width={7} height={7} patternUnits="userSpaceOnUse">
            <Path d="M0 7 L7 0" stroke={paleta.hachura} strokeWidth={2} />
            <Path d="M-2 2 L2 -2" stroke={paleta.hachura} strokeWidth={2} />
            <Path d="M5 9 L9 5" stroke={paleta.hachura} strokeWidth={2} />
          </Pattern>
          <Pattern id="pontilhado" width={7} height={7} patternUnits="userSpaceOnUse">
            <Rect x={1.4} y={1.4} width={1.8} height={1.8} rx={0.9} fill={paleta.pontilhado} />
          </Pattern>
        </Defs>

        {/* Piso: calçada em três lados, asfalto no miolo */}
        <Rect
          x={0}
          y={0}
          width={MM.placaLargura}
          height={MM.placaAltura}
          rx={8}
          fill={paleta.calcada}
        />
        <Rect
          x={MM.calcada}
          y={MM.calcada}
          width={MM.placaLargura - MM.calcada}
          height={MM.placaAltura - MM.calcada * 2}
          fill={paleta.asfalto}
        />
        <Rect
          x={MM.calcada}
          y={Y_CORREDOR}
          width={MM.placaLargura - MM.calcada}
          height={MM.corredor}
          fill={paleta.asfaltoEscuro}
        />

        {/* Corredor central de mão dupla */}
        <Line
          x1={MM.calcada + 4}
          y1={Y_EIXO_CORREDOR}
          x2={MM.placaLargura - 6}
          y2={Y_EIXO_CORREDOR}
          stroke={paleta.faixa}
          strokeWidth={1.4}
          strokeDasharray="11 8"
          opacity={0.7}
        />

        {/* Entrada de veículos, na extremidade oposta à calçada de fundo */}
        <G>
          <Path
            d={`M${MM.placaLargura - 5} ${Y_EIXO_CORREDOR - 15} l -14 9 l 14 9 z`}
            fill={paleta.destaque}
          />
          <TextoSvg
            x={MM.placaLargura - 7}
            y={Y_EIXO_CORREDOR + 19}
            fill={paleta.tintaSecundaria}
            fontSize={9}
            fontWeight="700"
            textAnchor="end"
          >
            ENTRADA
          </TextoSvg>
        </G>

        {/* Rota sugerida desde a entrada */}
        {rota && (
          <G>
            <Path
              d={rota}
              stroke={paleta.destaque}
              strokeWidth={3}
              strokeDasharray="7 6"
              strokeLinecap="round"
              fill="none"
              opacity={0.9}
            />
          </G>
        )}

        {vagas.map((vaga) => (
          <VagaNoMapa
            key={vaga.id}
            vaga={vaga}
            paleta={paleta}
            apagada={filtro !== 'TODAS' && vaga.tipo !== filtro}
            escolhida={selecionada === vaga.id}
            sugerida={sugerida === vaga.id}
            aoTocar={aoTocar}
          />
        ))}

        {/* Faixas demarcatórias de 2 mm: vagas vizinhas são encostadas e
            compartilham a faixa entre elas, como na peça impressa. */}
        {Array.from({ length: MM.vagasPorFileira + 1 }, (_, i) => {
          const x = X_PRIMEIRA_VAGA + i * MM.vagaLargura;
          return (
            <G key={`faixa-${i}`}>
              <Rect
                x={x - MM.faixa / 2}
                y={Y_FILEIRA_A}
                width={MM.faixa}
                height={MM.vagaProfundidade}
                fill={paleta.faixa}
                opacity={0.85}
              />
              <Rect
                x={x - MM.faixa / 2}
                y={Y_FILEIRA_B}
                width={MM.faixa}
                height={MM.vagaProfundidade}
                fill={paleta.faixa}
                opacity={0.85}
              />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

/** Caminho da entrada até a boca da vaga, seguindo o corredor. */
function caminhoAteAVaga(vaga: Vaga): string {
  const destinoX = xDaVaga(vaga.posicao) + MM.vagaLargura / 2;
  const bocaY = vaga.fileira === 'A' ? Y_CORREDOR - 2 : Y_FILEIRA_B + 2;

  return `M${MM.placaLargura - 12} ${Y_EIXO_CORREDOR}
          L${destinoX} ${Y_EIXO_CORREDOR}
          L${destinoX} ${bocaY}`;
}

/** O mapa só redesenha quando algo que ele mostra muda. */
export const MapaEstacionamento = memo(MapaBase, (anterior, proximo) => {
  if (
    anterior.filtro !== proximo.filtro ||
    anterior.selecionada !== proximo.selecionada ||
    anterior.sugerida !== proximo.sugerida ||
    anterior.mostrarRota !== proximo.mostrarRota ||
    anterior.largura !== proximo.largura ||
    anterior.vagas.length !== proximo.vagas.length
  ) {
    return false;
  }
  return anterior.vagas.every((vaga, i) => vaga.estado === proximo.vagas[i]?.estado);
});
