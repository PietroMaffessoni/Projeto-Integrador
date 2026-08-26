/**
 * Controlador de vagas — ESP32 + 16 TCRT5000 via dois PCF8574.
 *
 * O firmware faz uma coisa só: quando uma vaga muda de estado e a mudança se
 * sustenta por 300 ms, publica isso no broker com flag `retained`. Não guarda
 * histórico, não decide nada, não conhece o app. Toda a inteligência está do
 * outro lado do MQTT — e é por isso que trocar a maquete pelo simulador não
 * exige mexer em nada.
 *
 * Orçamento de latência desta etapa (docs/orcamento-latencia.md):
 *   varredura 20 ms + debounce 300 ms + publicação ~15 ms ≈ 335 ms
 */

#include <Arduino.h>

#include "configuracao.h"
#include "indicadores.h"
#include "rede.h"
#include "sensores.h"

namespace {

/** Cabe folgadamente: 16 vagas nunca mudam todas na mesma varredura de 20 ms. */
constexpr uint8_t MAXIMO_MUDANCAS = TOTAL_VAGAS;

LeituraVaga mudancas[MAXIMO_MUDANCAS];
uint32_t ultimaVarredura = 0;
uint32_t ultimoHeartbeat = 0;
uint32_t ultimaAnimacao = 0;
bool estadoInicialPublicado = false;

/** Índice do id na tabela de vagas, para acender o LED certo. */
int8_t indiceDaVaga(const char* id) {
  for (uint8_t i = 0; i < TOTAL_VAGAS; i++) {
    if (strcmp(sensores::idDaVaga(i), id) == 0) return static_cast<int8_t>(i);
  }
  return -1;
}

/**
 * Republica as 16 vagas.
 *
 * Chamado só depois de (re)conectar ao broker. Não é polling: é o retrato que
 * garante que as mensagens retained no broker descrevam a maquete de verdade,
 * inclusive as vagas que não mudaram desde que a placa ligou.
 */
void publicarEstadoCompleto() {
  Serial.println("[main] publicando o estado das 16 vagas");
  for (uint8_t i = 0; i < TOTAL_VAGAS; i++) {
    rede::publicarVaga(sensores::idDaVaga(i), sensores::estadoDe(i));
    delay(5);  // respira entre publicações para não estourar o buffer do TCP
  }
  indicadores::atualizarTodos();
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.printf("\n\nControlador de vagas %s — %s\n", VERSAO_FIRMWARE, ID_PLACA);

  indicadores::iniciar();

  if (!sensores::iniciar()) {
    Serial.println("[main] sem I2C: confira 3V3, GND, SDA/SCL e os endereços 0x20/0x21");
  }

#ifndef MODO_CALIBRACAO
  rede::iniciar();
#else
  Serial.println("[main] MODO CALIBRAÇÃO — nada será publicado");
  Serial.println("Ajuste o trimpot até '#' aparecer só com o carrinho sobre a vaga.\n");
#endif
}

void loop() {
#ifdef MODO_CALIBRACAO
  sensores::imprimirLeiturasCruas();
  delay(300);
  return;
#else

  rede::manter();

  const uint32_t agora = millis();

  if (agora - ultimaVarredura >= INTERVALO_POLLING_MS) {
    ultimaVarredura = agora;

    const uint8_t total = sensores::varrer(mudancas, MAXIMO_MUDANCAS);
    for (uint8_t i = 0; i < total; i++) {
      rede::publicarVaga(mudancas[i].id, mudancas[i].estado);

      const int8_t indice = indiceDaVaga(mudancas[i].id);
      if (indice >= 0) indicadores::atualizar(static_cast<uint8_t>(indice), mudancas[i].estado);
    }
  }

  if (rede::conectado() && !estadoInicialPublicado) {
    publicarEstadoCompleto();
    rede::publicarHeartbeat(sensores::barramentoSaudavel());
    ultimoHeartbeat = agora;
    estadoInicialPublicado = true;
  }

  // Caiu o broker: da próxima vez que voltar, republica tudo — as mensagens
  // retained podem ter ficado para trás enquanto estávamos fora.
  if (!rede::conectado()) {
    estadoInicialPublicado = false;
    if (agora - ultimaAnimacao >= 120) {
      ultimaAnimacao = agora;
      indicadores::animarEspera();
    }
  }

  if (agora - ultimoHeartbeat >= INTERVALO_HEARTBEAT_MS) {
    ultimoHeartbeat = agora;
    rede::publicarHeartbeat(sensores::barramentoSaudavel());
  }
#endif
}
