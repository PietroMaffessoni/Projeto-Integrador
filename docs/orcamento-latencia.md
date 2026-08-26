# Orçamento de latência

**Requisito:** do carrinho entrar na vaga até a cor mudar no celular, **abaixo de
500 ms**.

Orçamento não é medição: é a conta que se faz antes, para saber onde não se pode
gastar. Cada etapa abaixo tem um teto declarado, e a soma tem que caber.

| # | Etapa | Orçado | Onde está no código |
|--:|---|---:|---|
| 1 | Sensor reage à reflexão | ~1 ms | TCRT5000 + LM393, tempo de comutação |
| 2 | Espera pela próxima varredura | 0–20 ms (média 10) | `INTERVALO_POLLING_MS`, [`firmware/src/main.cpp`](../firmware/src/main.cpp) |
| 3 | **Debounce** | **300 ms** | `DEBOUNCE_MS`, [`sensores.cpp`](../firmware/src/sensores.cpp) |
| 4 | Serializar e publicar (Wi-Fi + MQTT QoS 1) | ~15 ms | [`rede.cpp`](../firmware/src/rede.cpp) |
| 5 | Broker roteia para o assinante | ~5 ms | Mosquitto na rede local |
| 6 | Validar payload e converter em evento | < 1 ms | [`fonte-mqtt.ts`](../backend/src/fontes/fonte-mqtt.ts) |
| 7 | Comparar estado e emitir no WebSocket | < 1 ms | [`servico-estado.ts`](../backend/src/servicos/servico-estado.ts) |
| 8 | Socket.IO entrega ao celular | ~20 ms | rede local |
| 9 | React re-renderiza o polígono | ~16 ms | um `fill` num `<Rect>` |
| | **Total** | **≈ 380 ms** | |

Sobram 120 ms de folga para o Wi-Fi ruim do dia da apresentação.

---

## O debounce domina, e isso é por escolha

Os 300 ms da etapa 3 são **79% do orçamento**. Poderiam ser cortados, e o
sistema ficaria visivelmente mais rápido — mas ficaria errado.

Abaixo de 150 ms, a sombra de uma mão passando sobre a maquete gera evento falso:
o TCRT5000 responde a luz refletida, e uma mão a 20 cm de distância muda a
iluminação da vaga o suficiente para o comparador oscilar. Numa apresentação,
com pessoas em volta gesticulando sobre a maquete, isso significa vagas piscando
sozinhas.

Trezentos milissegundos é o menor valor em que a maquete parou de reagir a
sombras nos testes de bancada, com margem. Comprou-se estabilidade com latência
que ninguém percebe — 380 ms é, para o olho, instantâneo.

---

## O que sai do caminho crítico

Três coisas poderiam entrar nesta conta e foram tiradas de propósito:

**A gravação no banco.** O evento é emitido no WebSocket **antes** de ser
enfileirado para o histórico ([`servico-estado.ts`](../backend/src/servicos/servico-estado.ts)).
Escrever no PostgreSQL custa 2–10 ms; esperar por isso seria pagar por algo que
nenhum usuário está olhando.

**A consulta de estado.** A verdade corrente das 16 vagas mora num `Map` em
memória. Se cada mensagem MQTT exigisse um `SELECT`, seriam mais 2–5 ms por
evento, mais a chance de o pool estar ocupado.

**O snapshot completo.** O servidor empurra `{ vaga, estado }` — 40 bytes. Enviar
as 16 vagas a cada mudança seria 20× mais dados para transmitir a mesma
informação.

---

## Como medir de verdade

O orçamento é uma previsão. Para confrontá-lo com a realidade:

1. Ligue o monitor serial do ESP32 (`pio device monitor`) — ele registra a hora
   de cada publicação.
2. Grave a tela do celular e a maquete no mesmo vídeo, a 60 fps.
3. Conte os quadros entre o carrinho parar sobre a vaga e o polígono mudar de
   cor. Cada quadro vale 16,7 ms.

Vinte e três quadros ≈ 380 ms. Acima de trinta, algo saiu do previsto — o
suspeito mais provável é o Wi-Fi (etapas 4 e 8), não o firmware.
