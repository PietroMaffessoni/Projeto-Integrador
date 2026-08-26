# Aplicativo

React Native com Expo. Mostra as 16 vagas sobre a planta do estacionamento,
desenhada em SVG próprio.

```bash
npm install
npm start        # leia o QR code com o Expo Go
```

---

## Endereço do backend

O app **descobre sozinho** onde o backend está: o Expo já serve o bundle a
partir do IP da máquina de desenvolvimento, e esse mesmo IP, na porta 3333, é o
backend em 99% dos casos ([`src/config.ts`](src/config.ts)).

O erro nº 1 ao testar no celular é apontar para `localhost` — que, no telefone, é
o próprio telefone.

Se precisar apontar para outra máquina:

```bash
EXPO_PUBLIC_API_URL=http://192.168.0.42:3333 npm start
```

ou preencha `extra.apiUrl` no [`app.json`](app.json).

---

## Snapshot + delta

Ao abrir, o app chama `GET /vagas` **uma vez** e daí em diante vive de
WebSocket, recebendo apenas `{ vaga, estado }` a cada mudança. A busca completa
se repete só quando a conexão cai e volta — nesse intervalo houve mudanças que
não chegaram por delta.

Não há polling em lugar nenhum: repetir a busca completa gastaria rádio do
celular para receber dados idênticos e ainda chegaria depois do WebSocket.

---

## O mapa

[`MapaEstacionamento.tsx`](src/componentes/MapaEstacionamento.tsx) desenha a
planta com `viewBox="0 0 345 305"` — **os milímetros reais da maquete**. Vagas de
40 × 80 mm, corredor de 95, calçada de 25. Conferir uma medida na peça física com
paquímetro é conferir o mapa.

Pintar uma vaga é trocar o `fill` de um `<Rect>`. O componente é memoizado e só
redesenha quando algum estado muda de fato.

---

## Cores

Verde e vermelho é o pior par possível para daltonismo. O par intuitivo separa
apenas **ΔE 4,1** sob deuteranopia; o par usado aqui — verde claro contra
vermelho escuro — separa **26,2**, mantendo a convenção do semáforo. Vaga ocupada
tem ainda **hachura diagonal**, sem informação tem **pontilhado**, e cada vaga
mostra o próprio identificador.

O raciocínio completo, com a medição, está em
[`docs/acessibilidade.md`](../docs/acessibilidade.md).

---

## Telas

| Aba | O que mostra |
|---|---|
| **Mapa** | planta das 16 vagas, contador de livres por fileira, filtro por tipo, detalhe com histórico ao tocar |
| **Ocupação** | ocupação atual por fileira e mapa de calor semanal por faixa horária |
| **Sensores** | anomalias detectadas pelo backend e endereço em uso — a tela de quem mantém a maquete |

## Estrutura

```
App.tsx              abas e tema
src/config.ts        descoberta do backend
src/tema.ts          paleta, espaçamento, tipografia
src/api/             cliente REST e tipos do contrato
src/estado/loja.ts   store (zustand) + WebSocket
src/componentes/     mapa SVG, legenda, filtro, painel, mapa de calor
src/telas/           as três abas
src/notificacoes.ts  aviso local quando uma vaga vigiada libera
```
