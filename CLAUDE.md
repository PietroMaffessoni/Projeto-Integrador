# Projeto: Sistema de Monitoramento de Vagas — Instituto Mauá

Projeto acadêmico de Ciências da Computação. Aplicativo que exibe em tempo real
quais vagas de estacionamento estão livres ou ocupadas, sobre uma planta do
estacionamento. A validação é feita numa maquete física instrumentada com
sensores, em escala 1:64.

---

## 1. Princípio arquitetural central

**A maquete não é o centro do sistema.** Ela é apenas uma das fontes possíveis de
eventos de ocupação. Toda a arquitetura deve ser agnóstica à origem do dado:
maquete física, sensores reais no campus ou um simulador em software devem ser
intercambiáveis sem alterar uma linha do backend ou do app.

O contrato entre as camadas é sempre o mesmo evento: *"a vaga X mudou para o
estado Y no instante Z"*.

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Firmware | C++ (Arduino framework) no ESP32 |
| Transporte | MQTT (broker Mosquitto na rede local) |
| Backend | Node.js + TypeScript + Fastify |
| Tempo real | WebSocket (Socket.IO) |
| Banco | PostgreSQL |
| App | React Native + Expo |
| Mapa | SVG vetorial próprio (`react-native-svg`) |

---

## 3. Estrutura do repositório

```
/firmware        Código do ESP32 (PlatformIO)
/backend         API REST, assinante MQTT e servidor WebSocket
/app             Aplicativo React Native (Expo)
/simulador       Publicador MQTT de eventos falsos, para dev e demo
/maquete         Modelos 3D (.stl, .step) e diagrama de ligação
/docs            Documentação acadêmica
```

---

## 4. Layout físico da maquete

Estacionamento retilíneo, duas fileiras de 8 vagas frente a frente, corredor
central de mão dupla, calçada em três lados e entrada de veículos numa das
extremidades do corredor.

Dimensões derivadas de medidas reais divididas por 64:

| Elemento | Real | Maquete |
|---|---|---|
| Vaga | 2,5 × 5,0 m | **40 × 80 mm** |
| Corredor central | 6,0 m | **95 mm** |
| Calçada | 1,6 m | **25 mm** |
| Faixa demarcatória | 12 cm | **2 mm** |
| Placa completa | — | **345 × 305 mm** |

Vagas adjacentes são encostadas e compartilham a faixa demarcatória entre elas.
Os carrinhos (Hot Wheels, ~68 × 30 mm) ficam lado a lado, porta com porta.

### Numeração das vagas

Identificador único usado do firmware até o mapa do app, sem tradução em
nenhuma camada intermediária:

- Fileira superior: `A1` a `A8`
- Fileira inferior: `B1` a `B8`

A numeração cresce do fundo (lado da calçada) em direção à entrada. Portanto
`A1` e `B1` são as vagas mais distantes da entrada.

### Impressão 3D

8 módulos idênticos de **80 × 127,5 mm**, cada um contendo duas vagas mais a
metade do corredor à sua frente. Um único STL impresso oito vezes. Calçada em
tiras retas de 25 mm. Filamento cinza claro ou branco fosco (PLA preto absorve
infravermelho e quebra a leitura).

Cada módulo inclui, modelados na própria peça:
- Furo do sensor a **30 mm da borda do corredor** (região sempre sólida sob o
  Hot Wheels; o centro exato da vaga pode cair num vão entre eixos)
- Berço do sensor com 0,4 mm de folga por lado
- Faixa demarcatória como rebaixo de 0,6 mm (não ressalto)
- Canaleta de cabos de 6 × 6 mm na face inferior, saindo pelo lado da calçada
- Encaixe tipo cauda de andorinha com 0,3 mm de folga

---

## 5. Hardware

- 1× **ESP32 DevKit v1**
- 16× sensores infravermelhos reflexivos **TCRT5000** com comparador LM393
- 2× expansores de porta **PCF8574** (endereços `0x20` e `0x21`), 8 entradas
  cada, ocupando apenas SDA e SCL do ESP32
- 1× fonte 5V / 2A
- 1× capacitor 470 µF no trilho de alimentação dos sensores
- Bornes ou conectores JST (48 conexões — nunca solda direta)
- Opcional: fita WS2812B com 16 LEDs, um sob cada vaga, espelhando o estado
  mostrado no app

**Tudo alimentado em 3,3 V.** O LM393 opera a partir de 3 V e, à distância de
leitura de ~4 mm, o LED infravermelho tem potência de sobra. Isso elimina a
necessidade de conversor de nível lógico.

O pino INT do PCF8574 não é usado. Polling a 20 ms é irrelevante diante do
debounce de 300 ms e simplifica firmware e fiação.

---

## 6. Contrato de dados (MQTT)

**Tópico de estado:**
```
maua/estacionamento/vaga/{ID}
```
Onde `{ID}` → `A1..A8`, `B1..B8`.

**Payload:**
```json
{
  "estado": "OCUPADA",
  "timestamp": "2026-08-26T14:32:05Z",
  "rssi": -58
}
```

`estado` → `LIVRE` | `OCUPADA`.

Publicar **sempre com flag `retained`**, para que um backend que reconecte
receba imediatamente o estado atual das 16 vagas sem esperar movimento.

**Tópico de heartbeat:**
```
maua/estacionamento/controlador/{ID_PLACA}/heartbeat
```
Publicado a cada 30 s. O backend marca vagas como `OFFLINE` se o controlador
ficar 2 minutos sem heartbeat — nunca deve exibir estado desatualizado como se
fosse verdade.

---

## 7. Banco de dados

```sql
CREATE TABLE vagas (
  id            VARCHAR(4) PRIMARY KEY,      -- 'A1'..'B8'
  fileira       CHAR(1) NOT NULL,
  posicao       SMALLINT NOT NULL,
  tipo          VARCHAR(20) DEFAULT 'COMUM', -- COMUM | PCD | IDOSO
  estado        VARCHAR(10) DEFAULT 'OFFLINE',
  atualizado_em TIMESTAMPTZ
);

CREATE TABLE eventos_ocupacao (
  id        BIGSERIAL PRIMARY KEY,
  vaga_id   VARCHAR(4) REFERENCES vagas(id),
  estado    VARCHAR(10) NOT NULL,
  ocorrido_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_eventos_vaga_tempo ON eventos_ocupacao (vaga_id, ocorrido_em DESC);
```

A tabela de histórico é obrigatória desde a primeira versão. É ela que habilita
previsão de ocupação, detecção de sensor defeituoso e mapa de calor temporal —
as funcionalidades que dão peso acadêmico ao projeto.

---

## 8. API

```
GET  /vagas            → estado atual das 16 vagas (snapshot inicial)
GET  /vagas/:id        → detalhe de uma vaga
GET  /estatisticas     → contagem de livres por fileira
GET  /historico/:id    → eventos de uma vaga
```

**WebSocket**, evento `vaga:mudou`:
```json
{ "vaga": "A3", "estado": "OCUPADA" }
```

---

## 9. Aplicativo

### Mapa

O mapa é um **SVG desenhado à mão** da planta do estacionamento, onde cada vaga
é um polígono cujo atributo `id` corresponde exatamente ao identificador do
banco (`A1`, `A2`, …). Pintar uma vaga é apenas trocar o `fill`.

### Padrão de sincronização: snapshot + delta

Ao abrir, o app busca **uma única vez** o estado completo via `GET /vagas`.
A partir daí recebe apenas as mudanças pelo WebSocket. Nunca refazer a busca
completa periodicamente.

### Telas mínimas

1. Mapa interativo com as 16 vagas
2. Contador de vagas livres por fileira
3. Filtro por tipo de vaga
4. Detalhe ao tocar numa vaga (estado e há quanto tempo)

---

## 10. Requisitos não-funcionais

**Latência.** Do carrinho entrar na vaga até a cor mudar no celular: **abaixo de
500 ms**. Orçamento atual → 380 ms, dominado pelo debounce de 300 ms no firmware.

**Debounce.** 300 ms de estabilidade antes de confirmar mudança de estado.
Abaixo de 150 ms, sombras de mãos sobre a maquete geram eventos falsos.

**Acessibilidade.** Vermelho e verde é o pior par possível para daltonismo
(~8% dos homens). Além da cor, vaga ocupada deve ter um segundo indicador
visual: hachura diagonal ou ícone.

**Honestidade de estado.** Vaga sem dado recente é `OFFLINE` e exibida em
cinza. Jamais assumir `LIVRE` por ausência de informação.

---

## 11. Decisões já tomadas — não reabrir

- **Não usar Google Maps ou qualquer API de mapas.** A API não conhece vagas
  individuais, o zoom não chega ao nível necessário e cria dependência de
  billing. O mapa é SVG próprio.
- **Não usar polling HTTP no app.** Atualização é por WebSocket, empurrada pelo
  servidor.
- **Não usar sensores ultrassônicos HC-SR04.** Em escala 1:64 o feixe abre
  demais e um sensor lê o carrinho da vaga vizinha.
- **Não imprimir a base como peça única.** Mesa pequena, empenamento e fila de
  impressora. Módulos.
- **Não publicar por polling no MQTT.** Publicar apenas na mudança de estado.

---

## 12. Fases de execução

Executar nesta ordem. **Não começar pelo hardware.**

- **Fase 0 —** Fechar o contrato de dados (tópicos MQTT, schema, endpoints).
- **Fase 1 —** Simulador publicando eventos aleatórios no MQTT. A partir daqui
  backend e app funcionam integralmente sem existir um único fio.
- **Fase 2 —** Caminho ponta a ponta com **um** sensor real.
- **Fase 3 —** Escalar para 16 vagas, montar a maquete, calibrar.
- **Fase 4 —** Funcionalidades avançadas (previsão, anomalia, notificações).

---

## 13. Modo demonstração

O sistema deve permitir alternar a fonte de eventos entre maquete e simulador
por variável de ambiente. Se um sensor falhar durante a apresentação, a troca
é transparente e ninguém percebe. Isso não é gambiarra — é a demonstração
prática do princípio da seção 1.

---

## 14. Riscos conhecidos

- **Rede institucional** costuma bloquear dispositivos IoT (portal cativo,
  WPA2-Enterprise). Usar roteador próprio ou hotspot. Testar semanas antes.
- **Fila da impressora 3D** é o maior risco de cronograma: ~24 h de impressão.
- **Iluminação ambiente forte** satura o receptor infravermelho. Calibrar no
  local da apresentação.
