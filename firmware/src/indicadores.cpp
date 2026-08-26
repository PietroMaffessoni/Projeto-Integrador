#include "indicadores.h"

#include <Adafruit_NeoPixel.h>

#include "configuracao.h"

namespace {

Adafruit_NeoPixel fita(TOTAL_LEDS, PINO_LEDS, NEO_GRB + NEO_KHZ800);
bool ligada = false;

/**
 * As mesmas cores do app, na mesma lógica: verde claro para livre, vermelho
 * escuro para ocupada. A diferença de luminosidade entre as duas é o que salva
 * a leitura de quem não distingue as matizes.
 */
constexpr uint8_t VERDE[3] = {76, 194, 76};
constexpr uint8_t VERMELHO[3] = {156, 28, 28};
constexpr uint8_t AZUL[3] = {42, 120, 214};

}  // namespace

namespace indicadores {

void iniciar() {
  if (!USAR_LEDS) return;
  fita.begin();
  fita.setBrightness(BRILHO_LEDS);
  fita.clear();
  fita.show();
  ligada = true;
}

void atualizar(uint8_t indice, EstadoVaga estado) {
  if (!ligada || indice >= TOTAL_LEDS) return;
  const uint8_t* cor = (estado == EstadoVaga::Ocupada) ? VERMELHO : VERDE;
  fita.setPixelColor(indice, fita.Color(cor[0], cor[1], cor[2]));
  fita.show();
}

void atualizarTodos() {
  if (!ligada) return;
  for (uint8_t i = 0; i < TOTAL_LEDS && i < TOTAL_VAGAS; i++) {
    const uint8_t* cor = (sensores::estadoDe(i) == EstadoVaga::Ocupada) ? VERMELHO : VERDE;
    fita.setPixelColor(i, fita.Color(cor[0], cor[1], cor[2]));
  }
  fita.show();
}

void animarEspera() {
  if (!ligada) return;
  static uint8_t posicao = 0;
  fita.clear();
  fita.setPixelColor(posicao, fita.Color(AZUL[0], AZUL[1], AZUL[2]));
  fita.show();
  posicao = (posicao + 1) % TOTAL_LEDS;
}

}  // namespace indicadores
