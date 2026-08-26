#pragma once

/**
 * Configuração do controlador.
 *
 * As credenciais ficam aqui em texto claro porque a rede é um roteador próprio,
 * montado só para a demonstração e sem saída para a internet. Numa instalação
 * de verdade no campus, isto sai daqui e vai para NVS/Preferences, provisionado
 * na primeira ligação.
 */

// ---------------------------------------------------------------- Rede ------
// A rede institucional costuma bloquear dispositivos IoT (portal cativo,
// WPA2-Enterprise). Use roteador próprio ou hotspot — CLAUDE.md, seção 14.
#define WIFI_SSID       "maquete-vagas"
#define WIFI_SENHA      "estacionamento"

#define MQTT_HOST       "192.168.4.2"
#define MQTT_PORTA      1883
#define MQTT_USUARIO    ""      // vazio = conexão anônima
#define MQTT_SENHA      ""

// ------------------------------------------------------------- Contrato -----
// Precisa bater exatamente com docs/contrato-de-dados.md.
#define PREFIXO_MQTT    "maua/estacionamento"
#define ID_PLACA        "placa-01"

// ------------------------------------------------------------- Sensores -----
#define PINO_SDA        21
#define PINO_SCL        22

#define ENDERECO_PCF_A  0x20   // fileira A — vagas A1..A8
#define ENDERECO_PCF_B  0x21   // fileira B — vagas B1..B8

/**
 * O módulo TCRT5000 com LM393 puxa OUT para nível BAIXO quando enxerga
 * reflexão — ou seja, quando há carrinho sobre a vaga. Se o seu módulo for de
 * lógica invertida, mude para false e nada mais precisa mudar.
 */
#define SENSOR_ATIVO_EM_NIVEL_BAIXO true

// --------------------------------------------------------------- Tempos -----
/**
 * 300 ms de estabilidade antes de confirmar a mudança (CLAUDE.md, seção 10).
 * Abaixo de 150 ms, a sombra de uma mão passando sobre a maquete já gera evento
 * falso. Acima de 500 ms, a demonstração começa a parecer travada.
 */
#define DEBOUNCE_MS         300

/** Varredura dos dois expansores. Barato: são duas leituras de 1 byte. */
#define INTERVALO_POLLING_MS 20

#define INTERVALO_HEARTBEAT_MS 30000

/** Espera entre tentativas de reconexão ao broker. */
#define RECONEXAO_MQTT_MS   3000

// ----------------------------------------------------------------- LEDs -----
/** Fita WS2812B opcional, um LED sob cada vaga, espelhando o app. */
#define USAR_LEDS       true
#define PINO_LEDS       5
#define TOTAL_LEDS      16
#define BRILHO_LEDS     40     // 0–255; acima disso ofusca na foto da defesa
