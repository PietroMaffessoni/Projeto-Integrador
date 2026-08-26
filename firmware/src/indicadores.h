#pragma once

#include <Arduino.h>

#include "sensores.h"

/**
 * Fita WS2812B opcional, um LED sob cada vaga.
 *
 * Existe por um motivo de apresentação: quem está de pé em volta da maquete não
 * consegue ver a tela do celular. Com os LEDs, a maquete conta a mesma história
 * que o app — e o espectador vê a cor mudar no mesmo instante nos dois lugares.
 */
namespace indicadores {

void iniciar();

/** Pinta o LED de uma vaga conforme o estado. */
void atualizar(uint8_t indice, EstadoVaga estado);

/** Repinta os 16 de uma vez, a partir do estado estável dos sensores. */
void atualizarTodos();

/** Pulso azul percorrendo a fita: a placa está viva mas sem broker. */
void animarEspera();

}  // namespace indicadores
