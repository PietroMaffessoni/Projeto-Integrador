# Plano de fases

A ordem existe por um motivo: **não começar pelo hardware**. Software feito
esperando o sensor chegar é software que só começa a ser testado quando já não há
tempo para consertar nada.

---

## Fase 0 — Contrato de dados ✅

Fechar tópicos MQTT, schema do banco e endpoints **antes** de escrever qualquer
implementação.

| Entregue | Onde |
|---|---|
| Contrato completo, com payloads e regras | [`contrato-de-dados.md`](contrato-de-dados.md) |
| Contrato em código (tipos, tópicos, validação) | [`backend/src/contrato/`](../backend/src/contrato/) |
| Schema e migrações | [`backend/src/dados/migracoes/`](../backend/src/dados/migracoes/) |
| Testes do contrato | `npm test` no backend — 22 casos |

---

## Fase 1 — Simulador e sistema completo sem fios ✅

A partir daqui, backend e app funcionam integralmente sem existir um único fio.

| Entregue | Onde |
|---|---|
| Publicador MQTT que imita a maquete | [`simulador/`](../simulador/) |
| Backend completo: REST, WebSocket, histórico | [`backend/`](../backend/) |
| Aplicativo com mapa SVG, filtro e detalhe | [`app/`](../app/) |
| Fonte simulada dentro do processo | `npm run dev:demo` |

```bash
cd backend && npm run dev:demo     # sem broker, sem banco
cd app && npm start
```

---

## Fase 2 — Ponta a ponta com um sensor real ✅

O caminho inteiro percorrido por **um** TCRT5000, antes de multiplicar por 16.

| Entregue | Onde |
|---|---|
| Firmware com debounce, publicação retida e heartbeat | [`firmware/src/`](../firmware/src/) |
| Modo calibração pelo serial | `-D MODO_CALIBRACAO=1` |
| Procedimento de calibração | [`calibracao-sensores.md`](calibracao-sensores.md) |

Para testar com um sensor só: ligue-o em `P0` do expansor `0x20` (vaga `A1`). As
outras 15 vagas vão reportar `LIVRE` — o que é honesto, já que os canais estão em
repouso — e o app mostra `A1` reagindo em tempo real.

---

## Fase 3 — Dezesseis vagas e a maquete montada ✅

| Entregue | Onde |
|---|---|
| Firmware varrendo 16 canais por dois PCF8574 | [`sensores.cpp`](../firmware/src/sensores.cpp) |
| Modelo 3D paramétrico do módulo de duas vagas | [`maquete/modulo_vaga.scad`](../maquete/modulo_vaga.scad) |
| Diagrama de ligação, endereçamento e montagem | [`maquete/README.md`](../maquete/README.md) |
| LEDs WS2812B espelhando o app na maquete | [`indicadores.cpp`](../firmware/src/indicadores.cpp) |

Falta apenas o trabalho físico: imprimir os oito módulos (~24 h de impressora),
soldar os rabichos, montar e calibrar.

---

## Fase 4 — Funcionalidades avançadas ✅

Tudo aqui se sustenta na tabela `eventos_ocupacao`, que existe desde a Fase 0 —
foi exatamente para isto.

| Entregue | Onde |
|---|---|
| Previsão de ocupação por faixa horária | [`previsao.ts`](../backend/src/servicos/previsao.ts) · `GET /previsao` |
| Mapa de calor semanal no app | [`MapaDeCalor.tsx`](../app/src/componentes/MapaDeCalor.tsx) |
| Detecção de sensor defeituoso (3 assinaturas) | [`anomalias.ts`](../backend/src/servicos/anomalias.ts) · `GET /anomalias` |
| Alertas empurrados por WebSocket | evento `alerta:anomalia` |
| Notificação local "avise quando liberar" | [`notificacoes.ts`](../app/src/notificacoes.ts) |
| Gerador de histórico sintético para demonstrar | `npm run semear-historico` |

---

## O que falta

Nada de software. O que resta é físico e depende de fila de impressora e de
tempo de bancada:

1. Imprimir um módulo e conferir encaixe e furo do sensor.
2. Imprimir os outros sete.
3. Soldar os 16 rabichos e montar.
4. Calibrar no local da apresentação.
5. Medir a latência real com vídeo a 60 fps e comparar com o orçamento de 380 ms
   ([`orcamento-latencia.md`](orcamento-latencia.md)).
