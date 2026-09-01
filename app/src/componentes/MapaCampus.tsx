import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, G, Path, Pattern, Rect, Text as TextoSvg } from 'react-native-svg';
import {
  EDIFICACOES,
  PLANTA,
  VIAS,
  ZONAS,
  type ZonaCampus,
} from '../dados/campus';
import { usarTema } from '../tema-contexto';

interface Props {
  largura: number;
  selecionada: string | null;
  /** Livres no setor-piloto — só ele tem número de verdade. */
  livresNoPiloto: number;
  semSinalNoPiloto: boolean;
  aoTocar: (zonaId: string) => void;
}

/**
 * Planta esquemática do campus, com o setor-piloto ao vivo.
 *
 * O contraste é o ponto: um setor pintado com dado real, cinco hachurados
 * esperando sensores. Isso mostra de uma vez a escala do problema (1.400 vagas)
 * e o que o projeto já resolve — sem fingir que mede o que não mede.
 */
export function MapaCampus({
  largura,
  selecionada,
  livresNoPiloto,
  semSinalNoPiloto,
  aoTocar,
}: Props): React.JSX.Element {
  const { paleta } = usarTema();
  const altura = (largura * PLANTA.altura) / PLANTA.largura;

  const corDaZona = (zona: ZonaCampus): string => {
    if (zona.situacao !== 'ao-vivo') return paleta.semSensor;
    if (semSinalNoPiloto) return paleta.offline;
    return livresNoPiloto > 0 ? paleta.livre : paleta.ocupada;
  };

  const tintaDaZona = (zona: ZonaCampus): string => {
    if (zona.situacao !== 'ao-vivo') return paleta.tintaSecundaria;
    if (semSinalNoPiloto) return paleta.tintaSobreOffline;
    return livresNoPiloto > 0 ? paleta.tintaSobreLivre : paleta.tintaSobreOcupada;
  };

  return (
    <View accessible accessibilityLabel="Planta esquemática do campus com os setores de estacionamento">
      <Svg width={largura} height={altura} viewBox={`0 0 ${PLANTA.largura} ${PLANTA.altura}`}>
        <Defs>
          {/* Hachura das áreas ainda sem sensor: "existe, mas não medimos". */}
          <Pattern id="semSensor" width={8} height={8} patternUnits="userSpaceOnUse">
            <Path d="M0 8 L8 0" stroke={paleta.semSensorTraco} strokeWidth={0.9} />
            <Path d="M-2 2 L2 -2" stroke={paleta.semSensorTraco} strokeWidth={0.9} />
            <Path d="M6 10 L10 6" stroke={paleta.semSensorTraco} strokeWidth={0.9} />
          </Pattern>
        </Defs>

        <Rect x={0} y={0} width={PLANTA.largura} height={PLANTA.altura} rx={10} fill={paleta.calcada} />

        {/* Vias de circulação */}
        <Rect
          x={VIAS.horizontal.x}
          y={VIAS.horizontal.y}
          width={VIAS.horizontal.largura}
          height={VIAS.horizontal.altura}
          fill={paleta.asfalto}
          rx={2}
        />
        <Rect
          x={VIAS.vertical.x}
          y={VIAS.vertical.y}
          width={VIAS.vertical.largura}
          height={VIAS.vertical.altura}
          fill={paleta.asfalto}
          rx={2}
        />

        {/* Portaria, no pé da via principal */}
        <G onPress={() => aoTocar('portaria')}>
          <Rect
            x={VIAS.portaria.x}
            y={VIAS.portaria.y}
            width={VIAS.portaria.largura}
            height={VIAS.portaria.altura}
            rx={3}
            fill={paleta.destaque}
          />
          <TextoSvg
            x={VIAS.portaria.x + VIAS.portaria.largura / 2}
            y={VIAS.portaria.y + 10}
            fill="#ffffff"
            fontSize={7}
            fontWeight="700"
            textAnchor="middle"
          >
            PORTARIA
          </TextoSvg>
        </G>

        {/* Edificações — contexto para localizar os setores */}
        {EDIFICACOES.map((predio) => (
          <G key={predio.id}>
            <Rect
              x={predio.x}
              y={predio.y}
              width={predio.largura}
              height={predio.altura}
              rx={5}
              fill={paleta.superficieSutil}
              stroke={paleta.borda}
              strokeWidth={1}
            />
            <TextoSvg
              x={predio.x + predio.largura / 2}
              y={predio.y + predio.altura / 2}
              fill={paleta.tintaSuave}
              fontSize={8}
              fontWeight="700"
              textAnchor="middle"
            >
              {predio.sigla}
            </TextoSvg>
            {predio.tipo === 'esporte' && (
              <G>
                <Rect
                  x={predio.x + 12}
                  y={predio.y + predio.altura / 2 + 12}
                  width={predio.largura - 24}
                  height={30}
                  rx={3}
                  fill="none"
                  stroke={paleta.tintaSuave}
                  strokeWidth={0.8}
                  opacity={0.5}
                />
                <Path
                  d={`M${predio.x + predio.largura / 2} ${predio.y + predio.altura / 2 + 12}
                      v30`}
                  stroke={paleta.tintaSuave}
                  strokeWidth={0.8}
                  opacity={0.5}
                />
              </G>
            )}
          </G>
        ))}

        {/* Setores de estacionamento */}
        {ZONAS.map((zona) => {
          const aoVivo = zona.situacao === 'ao-vivo';
          const escolhida = selecionada === zona.id;

          return (
            <G key={zona.id} onPress={() => aoTocar(zona.id)}>
              <Rect
                x={zona.x}
                y={zona.y}
                width={zona.largura}
                height={zona.altura}
                rx={5}
                fill={corDaZona(zona)}
              />
              {!aoVivo && (
                <Rect
                  x={zona.x}
                  y={zona.y}
                  width={zona.largura}
                  height={zona.altura}
                  rx={5}
                  fill="url(#semSensor)"
                />
              )}
              <Rect
                x={zona.x}
                y={zona.y}
                width={zona.largura}
                height={zona.altura}
                rx={5}
                fill="none"
                stroke={escolhida ? paleta.tintaPrimaria : aoVivo ? paleta.destaque : paleta.borda}
                strokeWidth={escolhida ? 2.5 : aoVivo ? 2 : 1}
              />

              <TextoSvg
                x={zona.x + zona.largura / 2}
                y={zona.y + zona.altura / 2 - 4}
                fill={tintaDaZona(zona)}
                fontSize={aoVivo ? 10 : 13}
                fontWeight="800"
                textAnchor="middle"
              >
                {zona.sigla}
              </TextoSvg>
              <TextoSvg
                x={zona.x + zona.largura / 2}
                y={zona.y + zona.altura / 2 + 9}
                fill={tintaDaZona(zona)}
                fontSize={8}
                fontWeight="600"
                textAnchor="middle"
                opacity={aoVivo ? 1 : 0.75}
              >
                {aoVivo
                  ? semSinalNoPiloto
                    ? 'sem sinal'
                    : `${livresNoPiloto} de ${zona.vagas} livres`
                  : `~${zona.vagas} vagas`}
              </TextoSvg>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
