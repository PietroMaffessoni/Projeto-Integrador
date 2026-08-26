#pragma once

#include <Arduino.h>

/** Quantidade de vagas monitoradas por este controlador. */
constexpr uint8_t TOTAL_VAGAS = 16;

/** Estado que o firmware é capaz de afirmar. OFFLINE é conclusão do backend. */
enum class EstadoVaga : uint8_t { Livre, Ocupada };

struct LeituraVaga {
  /** "A1".."B8" — o mesmo identificador que chega ao mapa do app. */
  const char* id;
  EstadoVaga estado;
};

namespace sensores {

/** Configura o I2C e coloca os dois PCF8574 em modo entrada. */
bool iniciar();

/**
 * Varre os 16 canais e aplica o debounce.
 *
 * Devolve quantas vagas mudaram de estado nesta varredura e preenche `mudancas`
 * com elas. Só mudanças são reportadas: publicar o estado inteiro a cada
 * varredura seria polling, e polling foi descartado (CLAUDE.md, seção 11).
 */
uint8_t varrer(LeituraVaga* mudancas, uint8_t capacidade);

/** Estado estável atual de uma vaga, para o boot e para os LEDs. */
EstadoVaga estadoDe(uint8_t indice);

/** Identificador da vaga no índice dado (0..15). */
const char* idDaVaga(uint8_t indice);

/** true se os dois expansores responderam na última varredura. */
bool barramentoSaudavel();

/** Imprime as leituras cruas no serial — usado no modo calibração. */
void imprimirLeiturasCruas();

}  // namespace sensores
