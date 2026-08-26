# Backend

API REST, assinante MQTT, servidor WebSocket e análises do histórico.

```bash
npm install
npm run dev:demo      # sem broker, sem banco — sobe funcionando
```

Depois disso, `http://localhost:3333/vagas` já responde com as 16 vagas se
movendo.

---

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | desenvolvimento com a fonte configurada no `.env` |
| `npm run dev:demo` | fonte simulada e persistência em memória — nada externo |
| `npm run migrar` | cria as tabelas e semeia as 16 vagas |
| `npm run semear-historico` | 28 dias de histórico sintético, para a Fase 4 |
| `npm test` | 22 testes do domínio, sem banco e sem rede |
| `npm run build` · `npm start` | compilação e execução em produção |

---

## Configuração

Copie `.env.example` para `.env`. As duas variáveis que mais importam:

```bash
FONTE_EVENTOS=mqtt|simulador     # de onde vêm os eventos
PERSISTENCIA=postgres|memoria    # onde mora o histórico
```

`FONTE_EVENTOS` é a única linha do sistema que decide se os eventos vêm da
maquete ou de um gerador — trocar de uma para outra no meio da apresentação é
mudar essa variável e reiniciar. O app não percebe.

---

## Como está organizado

```
src/
  contrato/      tópicos, payloads, catálogo de vagas — o contrato em código
  fontes/        FonteDeEventos + implementações MQTT e simulada
  servicos/      estado corrente, heartbeat, estatísticas, previsão, anomalias
  dados/         repositório (Postgres e memória), migrações, seeds
  rotas/         endpoints REST
  tempo-real.ts  Socket.IO
  aplicacao.ts   monta e liga as peças
  servidor.ts    entrada
```

### O caminho quente

`FonteMqtt` → `ServicoDeEstado` → WebSocket. Nessa ordem, e o banco fica de
fora: o evento é emitido para os apps **antes** de ser enfileirado para o
histórico. O orçamento é de 500 ms da vaga ao celular
([`docs/orcamento-latencia.md`](../docs/orcamento-latencia.md)), e não sobra
espaço para esperar disco.

### A verdade mora em memória

As 16 vagas vivem num `Map` dentro de `ServicoDeEstado`. A tabela `vagas` é
espelho — útil para inspecionar, mas nunca consultada no caminho de um evento.

### Repetição não é mudança

Mensagens `retained` reentregam o mesmo estado a cada reconexão. Estado igual ao
corrente é descartado: não vira linha no histórico nem tráfego no WebSocket.

---

## Testes

```bash
npm test
```

Cobrem o que quebraria silenciosamente: o descarte de repetições, o cálculo de
`OFFLINE`, a taxa de ocupação que ignora vagas sem sinal, a ponderação por tempo
da previsão e as três assinaturas de sensor defeituoso. Rodam contra
`RepositorioMemoria` — sem banco, sem broker, sem espera.
