# Sistema de Monitoramento de Vagas — Instituto Mauá

Monitoramento em tempo real de vagas de estacionamento, exibido sobre a planta
do estacionamento. A validação física é feita numa maquete instrumentada em
escala 1:64.

O princípio central do projeto está em [CLAUDE.md](CLAUDE.md): **a maquete não é
o centro do sistema**. Ela é apenas uma das fontes possíveis de eventos de
ocupação — maquete, sensores reais ou simulador são intercambiáveis sem alterar
uma linha do backend ou do app.

```
sensor / simulador  ──MQTT──▶  backend  ──WebSocket──▶  app
                                  │
                                  └──▶ PostgreSQL (histórico)
```

---

## Começando em 3 minutos (sem nenhum fio)

Não é preciso ter maquete, sensor, broker MQTT nem banco de dados para ver o
sistema inteiro funcionando.

```bash
# 1. Backend com fonte de eventos simulada e persistência em memória
cd backend
npm install
npm run dev:demo          # http://localhost:3333

# 2. Aplicativo (noutro terminal)
cd app
npm install
npm start                 # abre o Expo; leia o QR code com o Expo Go
```

O backend sobe já publicando movimento nas 16 vagas. O app conecta, busca o
snapshot inicial e passa a receber apenas as mudanças pelo WebSocket.

> Se o celular não conectar: o app precisa do IP da máquina na rede, não de
> `localhost`. Veja [app/README.md](app/README.md#endereço-do-backend).

---

## Rodando com a pilha completa (MQTT + PostgreSQL)

```bash
docker compose up -d              # Mosquitto (1883) + PostgreSQL (5432)

cd backend
cp .env.example .env
npm install
npm run migrar                    # cria tabelas e semeia as 16 vagas
npm run dev                       # FONTE_EVENTOS=mqtt

cd ../simulador                   # noutro terminal — no lugar da maquete
npm install
npm run dev
```

Para trocar a fonte de eventos da maquete real para o simulador (e vice-versa),
basta a variável `FONTE_EVENTOS`. Nada mais muda — é a seção 13 do CLAUDE.md.

---

## Estrutura

| Pasta | O que é |
|---|---|
| [`backend/`](backend/) | API REST, assinante MQTT, servidor WebSocket, histórico e análises |
| [`app/`](app/) | Aplicativo React Native (Expo) com o mapa SVG |
| [`simulador/`](simulador/) | Publicador MQTT que imita a maquete, para dev e demonstração |
| [`firmware/`](firmware/) | Código do ESP32 (PlatformIO): 16 sensores via PCF8574 |
| [`maquete/`](maquete/) | Modelo 3D paramétrico (OpenSCAD) e diagrama de ligação |
| [`docs/`](docs/) | Documentação acadêmica: arquitetura, contrato, calibração, demo |

## Documentação

- [Arquitetura](docs/arquitetura.md) — camadas, fluxo de um evento, decisões
- [Contrato de dados](docs/contrato-de-dados.md) — **fonte de verdade** de tópicos, payloads e API
- [Plano de fases](docs/plano-de-fases.md) — o que já está pronto em cada fase
- [Orçamento de latência](docs/orcamento-latencia.md) — onde vão os 380 ms
- [Calibração dos sensores](docs/calibracao-sensores.md) — procedimento no local
- [Roteiro de demonstração](docs/roteiro-demonstracao.md) — script da apresentação
