#pragma once

#include <Arduino.h>

#include "sensores.h"

namespace rede {

/** Conecta ao Wi-Fi (não bloqueia para sempre) e prepara o cliente MQTT. */
void iniciar();

/** Mantém Wi-Fi e MQTT vivos. Chamar a cada volta do loop. */
void manter();

bool conectado();

/**
 * Publica o estado de uma vaga com flag `retained`.
 *
 * O `retained` é o que faz um backend recém-conectado receber as 16 vagas
 * imediatamente, sem esperar um carrinho se mover (CLAUDE.md, seção 6).
 */
void publicarVaga(const char* vagaId, EstadoVaga estado);

/** Publica o sinal de vida do controlador. */
void publicarHeartbeat(bool sensoresOk);

}  // namespace rede
