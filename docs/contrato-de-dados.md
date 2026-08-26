# Contrato de dados

**Este documento é a fonte de verdade.** Firmware, simulador, backend e app são
implementações dele — quando algo divergir, é o código que está errado.

Fechar este contrato foi a Fase 0 do projeto, antes de existir uma linha de
firmware. É ele que permite que a maquete, sensores reais e o simulador sejam
intercambiáveis: os três falam isto, e nada além disto.

---

## 1. Identificadores de vaga

`A1` … `A8` (fileira superior) e `B1` … `B8` (fileira inferior).

A numeração cresce **do fundo em direção à entrada**: `A1` e `B1` são as vagas
mais distantes da entrada de veículos.

O mesmo identificador atravessa todas as camadas — tabela `IDS_VAGAS` do
firmware, tópico MQTT, chave primária no banco, atributo `id` do polígono no
mapa SVG. **Não há tradução em nenhuma camada intermediária**; qualquer mapa de
conversão entre camadas seria um lugar a mais para errar.

Tipos de vaga: `COMUM` (padrão), `PCD` (`A8`, `B8`), `IDOSO` (`A7`, `B7`) — as
reservadas ficam junto à entrada.

---

## 2. Estados

| Estado | Quem afirma | Significado |
|---|---|---|
| `LIVRE` | sensor | não há veículo |
| `OCUPADA` | sensor | há veículo |
| `OFFLINE` | **apenas o backend** | não sabemos, e não vamos fingir que sabemos |

`OFFLINE` nunca aparece num payload MQTT de vaga: sensor não relata a própria
ausência. É uma conclusão que o backend tira do silêncio do controlador.

---

## 3. MQTT — estado de vaga

**Tópico**

```
maua/estacionamento/vaga/{ID}
```

**Payload**

```json
{
  "estado": "OCUPADA",
  "timestamp": "2026-08-26T14:32:05Z",
  "rssi": -58
}
```

| Campo | Tipo | Obrigatório | Observação |
|---|---|:--:|---|
| `estado` | `"LIVRE"` \| `"OCUPADA"` | sim | qualquer outro valor é descartado com aviso |
| `timestamp` | ISO 8601 com fuso | **não** | o ESP32 acorda sem relógio; sem NTP sincronizado o campo é omitido e o backend usa a hora de chegada |
| `rssi` | inteiro (dBm) | não | diagnóstico de rádio |

**Regras**

- Publicar com **`retain: true`**. É o que faz um backend que reconecte receber
  imediatamente o estado atual das 16 vagas, sem esperar movimento.
- Publicar **apenas na mudança de estado**, nunca em intervalo fixo. A única
  exceção é a republicação completa logo após (re)conectar ao broker, para
  garantir que as mensagens retidas descrevam a maquete de verdade.
- QoS 1.

---

## 4. MQTT — heartbeat do controlador

**Tópico**

```
maua/estacionamento/controlador/{ID_PLACA}/heartbeat
```

**Payload**

```json
{
  "estado": "ONLINE",
  "timestamp": "2026-08-26T14:32:05Z",
  "rssi": -58,
  "uptime_s": 3812,
  "firmware": "1.0.0"
}
```

- Publicado a cada **30 s**, com `retain: true`.
- `estado: "OFFLINE"` é registrado como **última vontade (LWT)** na conexão: se a
  placa cair, o próprio broker publica isso, e o backend não precisa esperar o
  tempo de silêncio para reagir.
- Sem heartbeat por **2 minutos**, o backend marca todas as vagas daquele
  controlador como `OFFLINE`. Exibir estado velho como se fosse verdade é pior do
  que admitir a falta de informação.

---

## 5. API REST

Base: `http://{host}:3333`

| Método | Rota | Devolve |
|---|---|---|
| GET | `/vagas` | estado atual das 16 vagas — **snapshot inicial** |
| GET | `/vagas/:id` | detalhe de uma vaga |
| GET | `/estatisticas` | contagens por fileira, tipo e estado |
| GET | `/historico/:id?limite=100` | eventos de uma vaga, mais recentes primeiro |
| GET | `/previsao` · `/previsao/:id` | ocupação esperada por faixa horária |
| GET | `/anomalias` | sensores suspeitos e controladores fora do ar |
| GET | `/saude` | fonte de eventos ativa, controladores, contagens |

Rotas de demonstração (só com `PERMITIR_DEMO=true`):

| Método | Rota | Efeito |
|---|---|---|
| POST | `/demo/vaga/:id` `{"estado":"LIVRE"}` | injeta um evento como se viesse do sensor |
| POST | `/demo/embaralhar` | sorteia um novo estado para as 16 vagas |

### `GET /vagas`

```json
{
  "vagas": [
    {
      "id": "A1",
      "fileira": "A",
      "posicao": 1,
      "tipo": "COMUM",
      "estado": "OCUPADA",
      "atualizadoEm": "2026-08-26T14:32:05.912Z",
      "haSegundos": 42
    }
  ],
  "total": 16,
  "geradoEm": "2026-08-26T14:32:47.180Z"
}
```

---

## 6. WebSocket

Socket.IO no mesmo host e porta do REST.

**Evento `vaga:mudou`** — o servidor empurra **apenas o delta**:

```json
{ "vaga": "A3", "estado": "OCUPADA" }
```

**Evento `alerta:anomalia`** — reavaliado a cada minuto, emitido só quando o
conjunto de anomalias muda:

```json
{
  "total": 1,
  "anomalias": [
    {
      "tipo": "SENSOR_OSCILANDO",
      "severidade": "critico",
      "alvo": "A4",
      "mensagem": "14 mudanças de estado em 5 minutos na vaga A4.",
      "sugestao": "Ajustar o trimpot do LM393 ou conferir a altura do sensor no berço.",
      "detectadaEm": "2026-08-26T14:35:00.000Z"
    }
  ]
}
```

### Padrão de sincronização: snapshot + delta

1. Ao abrir, o app chama `GET /vagas` **uma vez**.
2. Daí em diante, vive só de `vaga:mudou`.
3. A busca completa se repete **apenas** quando a conexão cai e volta — nesse
   intervalo houve mudanças que não chegaram por delta.

Não há polling HTTP em lugar nenhum. Repetir `GET /vagas` de tempos em tempos
gastaria rádio do celular para receber 16 registros idênticos, e ainda assim
chegaria depois do WebSocket.

---

## 7. Banco de dados

```sql
CREATE TABLE vagas (
  id            VARCHAR(4) PRIMARY KEY,      -- 'A1'..'B8'
  fileira       CHAR(1) NOT NULL,
  posicao       SMALLINT NOT NULL,
  tipo          VARCHAR(20) DEFAULT 'COMUM',
  estado        VARCHAR(10) DEFAULT 'OFFLINE',
  atualizado_em TIMESTAMPTZ,
  controlador_id VARCHAR(32) NOT NULL DEFAULT 'placa-01'
);

CREATE TABLE eventos_ocupacao (
  id          BIGSERIAL PRIMARY KEY,
  vaga_id     VARCHAR(4) REFERENCES vagas(id),
  estado      VARCHAR(10) NOT NULL,
  ocorrido_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE controladores (
  id               VARCHAR(32) PRIMARY KEY,
  online           BOOLEAN NOT NULL DEFAULT false,
  ultimo_heartbeat TIMESTAMPTZ,
  rssi             SMALLINT
);
```

`vagas` é **espelho**, não fonte: a verdade corrente vive em memória no backend,
porque consultar o banco a cada mensagem MQTT colocaria o disco no caminho de um
evento que precisa chegar ao celular em menos de 500 ms.

`eventos_ocupacao` é **fonte**, e existe desde a primeira versão. Sem ela não há
previsão de ocupação, nem detecção de sensor defeituoso, nem mapa de calor — as
funcionalidades que dão peso acadêmico ao projeto. Só transições entram; estado
repetido não vira linha.

`controladores` guarda o último heartbeat para que a decisão sobre quem está vivo
sobreviva a um restart do backend.
