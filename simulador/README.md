# Simulador

Publica no broker exatamente o que o ESP32 publicaria: mesmos tópicos, mesmos
payloads, mesma flag `retained`, mesmo heartbeat, mesma última vontade. Para o
backend, os dois são indistinguíveis.

É isso que permitiu ter backend e aplicativo prontos e testados **antes de
existir um único fio** — a Fase 1 do projeto.

```bash
npm install
npm run dev                    # movimento contínuo, aleatório
npm run cenario                # roteiro fixo da apresentação
```

---

## Opções

```bash
npm run dev -- --modo cenario         # aleatorio (padrão) | cenario
npm run dev -- --url mqtt://192.168.0.10:1883
npm run dev -- --prefixo maua/estacionamento
npm run dev -- --placa placa-01
npm run dev -- --velocidade 3         # 3× mais rápido
npm run dev -- --ocupacao 0.7         # 70% das vagas ocupadas no início
```

## Os dois modos

**`aleatorio`** — cada vaga alterna sozinha, com permanências plausíveis: um
carro parado fica de 30 a 180 s, uma vaga vazia fica de 15 a 90 s. Serve para
desenvolver o app com a tela viva.

**`cenario`** — roteiro fixo, com tempos conhecidos e narração impressa no
terminal. Serve para a defesa: o apresentador fala olhando para o celular
sabendo exatamente o que vem a seguir. O roteiro está em
[`src/cenarios.ts`](src/cenarios.ts) e casa com
[`docs/roteiro-demonstracao.md`](../docs/roteiro-demonstracao.md).

---

## Por que o contrato está duplicado aqui

[`src/contrato.ts`](src/contrato.ts) repete os tópicos e o formato dos payloads
em vez de importar do backend. É de propósito: o simulador ocupa o lugar da
maquete, e a maquete também não importa código do backend — ela fala MQTT. Se o
simulador compartilhasse tipos com quem o consome, deixaria de testar o contrato
e passaria a testar a si mesmo.

A fonte de verdade dos dois lados é
[`docs/contrato-de-dados.md`](../docs/contrato-de-dados.md).
