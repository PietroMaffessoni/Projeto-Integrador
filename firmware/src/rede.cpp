#include "rede.h"

#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <time.h>

#include "configuracao.h"

namespace {

WiFiClient clienteWifi;
PubSubClient mqtt(clienteWifi);

char topicoHeartbeat[96];
uint32_t ultimaTentativa = 0;
bool relogioSincronizado = false;

void montarTopicoVaga(const char* vagaId, char* destino, size_t tamanho) {
  snprintf(destino, tamanho, "%s/vaga/%s", PREFIXO_MQTT, vagaId);
}

/**
 * Timestamp ISO 8601 em UTC, ou string vazia se o relógio ainda não sincronizou.
 *
 * O ESP32 acorda sem noção de data. Enviar 1970 seria pior do que não enviar: o
 * contrato deixa `timestamp` opcional justamente para isso, e o backend usa a
 * hora de chegada quando ele falta.
 */
bool horaAtualIso(char* destino, size_t tamanho) {
  if (!relogioSincronizado) return false;

  time_t agora = time(nullptr);
  if (agora < 1700000000) return false;  // antes de 2023: relógio não confiável

  struct tm utc;
  gmtime_r(&agora, &utc);
  strftime(destino, tamanho, "%Y-%m-%dT%H:%M:%SZ", &utc);
  return true;
}

void conectarWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[wifi] conectando a %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // dormir adiciona dezenas de ms ao caminho crítico
  WiFi.begin(WIFI_SSID, WIFI_SENHA);

  const uint32_t limite = millis() + 15000;
  while (WiFi.status() != WL_CONNECTED && millis() < limite) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] conectado — ip %s, rssi %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    configTime(0, 0, "pool.ntp.org", "a.st1.ntp.br");
    relogioSincronizado = true;
  } else {
    Serial.println("[wifi] falhou — tentando de novo no próximo ciclo");
  }
}

void conectarMqtt() {
  if (mqtt.connected() || WiFi.status() != WL_CONNECTED) return;
  if (millis() - ultimaTentativa < RECONEXAO_MQTT_MS) return;
  ultimaTentativa = millis();

  char clientId[48];
  snprintf(clientId, sizeof(clientId), "%s-%04X", ID_PLACA,
           static_cast<uint16_t>(ESP.getEfuseMac() & 0xFFFF));

  // Última vontade: se a placa cair, o próprio broker avisa o backend, que não
  // precisa esperar os dois minutos de silêncio para marcar as vagas OFFLINE.
  const char* vontade = "{\"estado\":\"OFFLINE\"}";

  const bool ok = strlen(MQTT_USUARIO) > 0
                      ? mqtt.connect(clientId, MQTT_USUARIO, MQTT_SENHA, topicoHeartbeat, 1,
                                     true, vontade)
                      : mqtt.connect(clientId, nullptr, nullptr, topicoHeartbeat, 1, true,
                                     vontade);

  if (ok) {
    Serial.printf("[mqtt] conectado a %s:%d como %s\n", MQTT_HOST, MQTT_PORTA, clientId);
  } else {
    Serial.printf("[mqtt] falha (estado %d) — nova tentativa em %d ms\n", mqtt.state(),
                  RECONEXAO_MQTT_MS);
  }
}

}  // namespace

namespace rede {

void iniciar() {
  snprintf(topicoHeartbeat, sizeof(topicoHeartbeat), "%s/controlador/%s/heartbeat",
           PREFIXO_MQTT, ID_PLACA);

  mqtt.setServer(MQTT_HOST, MQTT_PORTA);
  mqtt.setBufferSize(256);
  // Sem isto, o PubSubClient espera até 15 s numa publicação com a rede ruim —
  // e o orçamento de latência do projeto inteiro é de 500 ms.
  mqtt.setSocketTimeout(2);

  conectarWifi();
  conectarMqtt();
}

void manter() {
  if (WiFi.status() != WL_CONNECTED) {
    conectarWifi();
    return;
  }
  if (!mqtt.connected()) {
    conectarMqtt();
    return;
  }
  mqtt.loop();
}

bool conectado() { return WiFi.status() == WL_CONNECTED && mqtt.connected(); }

void publicarVaga(const char* vagaId, EstadoVaga estado) {
  if (!mqtt.connected()) return;

  JsonDocument doc;
  doc["estado"] = (estado == EstadoVaga::Ocupada) ? "OCUPADA" : "LIVRE";

  char instante[32];
  if (horaAtualIso(instante, sizeof(instante))) {
    doc["timestamp"] = instante;
  }
  doc["rssi"] = WiFi.RSSI();

  char payload[128];
  const size_t tamanho = serializeJson(doc, payload, sizeof(payload));

  char topico[96];
  montarTopicoVaga(vagaId, topico, sizeof(topico));

  const bool ok = mqtt.publish(topico, reinterpret_cast<const uint8_t*>(payload), tamanho, true);
  Serial.printf("[mqtt] %s %s%s\n", vagaId, doc["estado"].as<const char*>(),
                ok ? "" : "  (FALHA ao publicar)");
}

void publicarHeartbeat(bool sensoresOk) {
  if (!mqtt.connected()) return;

  JsonDocument doc;
  doc["estado"] = sensoresOk ? "ONLINE" : "OFFLINE";

  char instante[32];
  if (horaAtualIso(instante, sizeof(instante))) {
    doc["timestamp"] = instante;
  }
  doc["rssi"] = WiFi.RSSI();
  doc["uptime_s"] = millis() / 1000;
  doc["firmware"] = VERSAO_FIRMWARE;

  char payload[192];
  const size_t tamanho = serializeJson(doc, payload, sizeof(payload));
  mqtt.publish(topicoHeartbeat, reinterpret_cast<const uint8_t*>(payload), tamanho, true);
}

}  // namespace rede
