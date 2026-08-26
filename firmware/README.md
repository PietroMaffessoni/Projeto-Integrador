# Firmware

ESP32 DevKit v1 lendo 16 TCRT5000 através de dois PCF8574 e publicando em MQTT.

```bash
pio run              # compila
pio run -t upload    # grava
pio device monitor   # serial a 115200
```

Antes de gravar, ajuste [`src/configuracao.h`](src/configuracao.h): SSID, senha e
o IP do broker.

---

## O que este firmware faz — e o que não faz

Faz uma coisa só: quando uma vaga muda de estado e a mudança se sustenta por
300 ms, publica isso no broker com flag `retained`.

Não guarda histórico, não calcula estatística, não conhece o aplicativo, não
recebe comando nenhum. Toda a inteligência está do outro lado do MQTT — e é por
isso que trocar a maquete pelo simulador não exige mexer aqui.

---

## Decisões

**Debounce de 300 ms.** É 79% do orçamento de latência do projeto inteiro, e é
proposital: abaixo de 150 ms, a sombra de uma mão passando sobre a maquete gera
evento falso.

**Varredura de 20 ms, sem usar o pino INT.** O PCF8574 sabe avisar por
interrupção quando uma entrada muda, e ignoramos isso: 20 ms é irrelevante
diante dos 300 ms de debounce, e a varredura custa duas leituras de 1 byte.

**Publicar só na mudança.** Nunca em intervalo. A única exceção é a republicação
das 16 vagas logo após (re)conectar ao broker — não é polling, é garantir que as
mensagens retidas descrevam a maquete de verdade.

**Última vontade (LWT).** Na conexão, o firmware registra
`{"estado":"OFFLINE"}` no tópico de heartbeat. Se a placa cair, o próprio broker
publica isso e o backend marca as vagas como `OFFLINE` na hora, sem esperar os
dois minutos de silêncio.

**Timestamp opcional.** O ESP32 acorda sem relógio. Enquanto o NTP não
sincroniza, o campo é omitido — o contrato permite, e o backend usa a hora de
chegada. Mandar 1970 seria pior do que não mandar.

**Tudo em 3,3 V.** O LM393 opera a partir de 3 V e, a ~4 mm de distância de
leitura, o LED infravermelho tem potência de sobra. Isso elimina o conversor de
nível lógico.

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| [`main.cpp`](src/main.cpp) | orquestra: varre, publica, mantém o heartbeat |
| [`sensores.cpp`](src/sensores.cpp) | I²C, debounce e a tabela vaga ↔ canal |
| [`rede.cpp`](src/rede.cpp) | Wi-Fi, MQTT, payloads |
| [`indicadores.cpp`](src/indicadores.cpp) | fita WS2812B opcional |
| [`configuracao.h`](src/configuracao.h) | tudo que muda de instalação para instalação |

A correspondência entre expansor, bit e vaga aparece **uma única vez**, na tabela
`IDS_VAGAS` de `sensores.cpp`. Se a fiação mudar, muda-se ali e nada mais.

---

## Modo calibração

```ini
build_flags = -D MODO_CALIBRACAO=1
```

Neste modo nada é publicado: o firmware só imprime as 16 leituras no serial, três
vezes por segundo, para ajustar os trimpots. O procedimento completo está em
[`docs/calibracao-sensores.md`](../docs/calibracao-sensores.md).

---

## Diagnóstico rápido

| Sintoma | Causa provável |
|---|---|
| `PCF8574 0x2X não respondeu` | alimentação, SDA/SCL trocados ou jumper de endereço errado |
| Todas as vagas ocupadas | os pinos não entraram em modo entrada — conferir `sensores::iniciar()` |
| `[mqtt] falha (estado -2)` | broker inalcançável; conferir IP e se o celular/notebook está na mesma rede |
| Publica mas o app não vê | prefixo de tópico diferente do backend |
