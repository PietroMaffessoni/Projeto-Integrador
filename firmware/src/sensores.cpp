#include "sensores.h"

#include <Wire.h>

#include "configuracao.h"

namespace {

/**
 * Ordem física dos canais.
 *
 * O expansor 0x20 carrega a fileira A e o 0x21 a fileira B; dentro de cada um,
 * o bit 0 é a vaga 1. Esta tabela é o único lugar do firmware que sabe disso —
 * se a fiação mudar, muda aqui e nada mais.
 */
const char* const IDS_VAGAS[TOTAL_VAGAS] = {
    "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8",
    "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8",
};

struct Canal {
  EstadoVaga estavel;
  EstadoVaga candidato;
  uint32_t candidatoDesde;
  bool iniciado;
};

Canal canais[TOTAL_VAGAS];
bool barramentoOk = false;
uint8_t ultimoBrutoA = 0xFF;
uint8_t ultimoBrutoB = 0xFF;

/** Lê o byte de entradas de um PCF8574. 0xFF (tudo alto) se não responder. */
bool lerExpansor(uint8_t endereco, uint8_t& destino) {
  if (Wire.requestFrom(endereco, static_cast<uint8_t>(1)) != 1) {
    return false;
  }
  destino = Wire.read();
  return true;
}

EstadoVaga interpretar(uint8_t bruto, uint8_t bit) {
  const bool nivelAlto = (bruto >> bit) & 0x01;
  const bool detectou = SENSOR_ATIVO_EM_NIVEL_BAIXO ? !nivelAlto : nivelAlto;
  return detectou ? EstadoVaga::Ocupada : EstadoVaga::Livre;
}

}  // namespace

namespace sensores {

bool iniciar() {
  Wire.begin(PINO_SDA, PINO_SCL);
  Wire.setClock(100000);  // 100 kHz: cabo chapado de 40 cm não pede mais

  // O PCF8574 é quase-bidirecional: para usar um pino como entrada, escreve-se
  // 1 nele. Sem isto, os pinos ficam presos em nível baixo e todas as vagas
  // aparecem ocupadas.
  for (uint8_t endereco : {ENDERECO_PCF_A, ENDERECO_PCF_B}) {
    Wire.beginTransmission(endereco);
    Wire.write(0xFF);
    if (Wire.endTransmission() != 0) {
      Serial.printf("[sensores] PCF8574 0x%02X não respondeu\n", endereco);
      barramentoOk = false;
      return false;
    }
  }

  const uint32_t agora = millis();
  for (uint8_t i = 0; i < TOTAL_VAGAS; i++) {
    canais[i] = {EstadoVaga::Livre, EstadoVaga::Livre, agora, false};
  }

  barramentoOk = true;
  Serial.println("[sensores] dois expansores prontos, 16 canais em modo entrada");
  return true;
}

uint8_t varrer(LeituraVaga* mudancas, uint8_t capacidade) {
  uint8_t brutoA = 0;
  uint8_t brutoB = 0;

  const bool okA = lerExpansor(ENDERECO_PCF_A, brutoA);
  const bool okB = lerExpansor(ENDERECO_PCF_B, brutoB);
  barramentoOk = okA && okB;

  if (!barramentoOk) {
    // Sem leitura confiável, o firmware fica calado. Quem conclui que a
    // informação envelheceu é o backend, pela ausência de heartbeat.
    return 0;
  }

  ultimoBrutoA = brutoA;
  ultimoBrutoB = brutoB;

  const uint32_t agora = millis();
  uint8_t total = 0;

  for (uint8_t i = 0; i < TOTAL_VAGAS; i++) {
    const uint8_t bruto = (i < 8) ? brutoA : brutoB;
    const EstadoVaga lido = interpretar(bruto, i % 8);
    Canal& canal = canais[i];

    // Primeira varredura: adota o que se vê, sem esperar debounce, e reporta
    // para o backend saber o estado inicial das 16 vagas.
    if (!canal.iniciado) {
      canal.iniciado = true;
      canal.estavel = lido;
      canal.candidato = lido;
      canal.candidatoDesde = agora;
      if (total < capacidade) mudancas[total++] = {IDS_VAGAS[i], lido};
      continue;
    }

    if (lido != canal.candidato) {
      // A leitura mudou: reinicia a contagem de estabilidade.
      canal.candidato = lido;
      canal.candidatoDesde = agora;
      continue;
    }

    if (lido == canal.estavel) continue;

    // Mesmo valor por tempo suficiente: agora é mudança de verdade.
    if (agora - canal.candidatoDesde >= DEBOUNCE_MS) {
      canal.estavel = lido;
      if (total < capacidade) mudancas[total++] = {IDS_VAGAS[i], lido};
    }
  }

  return total;
}

EstadoVaga estadoDe(uint8_t indice) {
  return indice < TOTAL_VAGAS ? canais[indice].estavel : EstadoVaga::Livre;
}

const char* idDaVaga(uint8_t indice) {
  return indice < TOTAL_VAGAS ? IDS_VAGAS[indice] : "??";
}

bool barramentoSaudavel() { return barramentoOk; }

void imprimirLeiturasCruas() {
  uint8_t brutoA = 0;
  uint8_t brutoB = 0;
  const bool okA = lerExpansor(ENDERECO_PCF_A, brutoA);
  const bool okB = lerExpansor(ENDERECO_PCF_B, brutoB);

  if (!okA || !okB) {
    Serial.println("I2C sem resposta — confira alimentação, SDA/SCL e os endereços");
    return;
  }

  Serial.print("A: ");
  for (uint8_t i = 0; i < 8; i++) {
    Serial.printf("%s=%c ", IDS_VAGAS[i],
                  interpretar(brutoA, i) == EstadoVaga::Ocupada ? '#' : '.');
  }
  Serial.print(" | B: ");
  for (uint8_t i = 0; i < 8; i++) {
    Serial.printf("%s=%c ", IDS_VAGAS[i + 8],
                  interpretar(brutoB, i) == EstadoVaga::Ocupada ? '#' : '.');
  }
  Serial.printf("  [cru A=0x%02X B=0x%02X]\n", brutoA, brutoB);
}

}  // namespace sensores
