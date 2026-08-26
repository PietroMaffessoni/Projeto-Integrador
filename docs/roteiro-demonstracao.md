# Roteiro de demonstração

O objetivo não é mostrar que a maquete funciona. É mostrar que **o sistema não
depende da maquete** — que é a tese do projeto.

---

## Antes de sair de casa

- [ ] Roteador próprio configurado com SSID `maquete-vagas`. **A rede
      institucional costuma bloquear dispositivos IoT** (portal cativo,
      WPA2-Enterprise) — testar isso na véspera é tarde demais, teste semanas
      antes.
- [ ] Backend e broker rodando no notebook, conectados a esse roteador.
- [ ] `npm run semear-historico` executado, para o mapa de calor ter o que
      mostrar.
- [ ] Celular com o app aberto e conectado — canto superior mostrando **Ao vivo**.
- [ ] Simulador testado no modo cenário: `npm run cenario`.
- [ ] Maquete calibrada **na iluminação do local**.
- [ ] Plano B pronto: um segundo terminal com `FONTE_EVENTOS=simulador` pronto
      para subir.

---

## Roteiro, 8 minutos

### 1. O problema (30 s)

Estacionamento cheio, motorista rodando entre as fileiras procurando vaga. A
informação existe — cada vaga sabe se está ocupada — mas ninguém consegue vê-la.

### 2. O sistema no ar (1 min)

Abra o app projetado. Mapa das 16 vagas, contador de livres por fileira.

> "Isto é a planta do estacionamento. Cada polígono é uma vaga real, e a cor é o
> estado dela agora."

Aponte a legenda: livre é verde e sólido, ocupada é vermelho e **hachurado**,
sem informação é cinza e pontilhado.

> "A hachura não é enfeite. Verde e vermelho é o pior par possível para
> daltonismo — medimos: as duas cores separam 4,1 numa escala em que 8 é o
> mínimo. Ajustamos as cores e acrescentamos textura; agora separam 26."

### 3. A maquete respondendo (2 min)

Coloque um carrinho na vaga A5. **A cor muda no projetor em menos de meio
segundo.**

> "Do sensor ao celular, o orçamento é de 380 ms, e três quartos disso é debounce
> — espera proposital de 300 ms para que a sombra de uma mão não gere evento
> falso."

Passe a mão sobre a maquete, deliberadamente. Nada muda. Tire o carrinho: volta a
verde.

### 4. A troca de fonte — o ponto alto (2 min)

> "Agora o mais importante do projeto: a maquete não é o centro do sistema."

Desligue a fonte do ESP32, na frente de todo mundo.

Espere. Em até dois minutos as 16 vagas ficam **cinza, não verdes**.

> "Repare que ele não disse que as vagas estão livres. Ele disse que não sabe.
> Uma vaga 'livre' que na verdade está ocupada é pior do que informação
> nenhuma."

Suba o simulador:

```bash
cd simulador && npm run cenario
```

As vagas voltam a se mover — **sem trocar uma linha de código, sem reiniciar o
app**.

> "O backend não sabe se do outro lado tem uma maquete, o estacionamento real do
> campus ou um programa. Ele recebe sempre a mesma frase: a vaga X mudou para o
> estado Y no instante Z."

### 5. O que o histórico permite (1,5 min)

Aba **Ocupação**: mapa de calor por dia e hora.

> "Cada mudança de estado vira uma linha no banco desde a primeira versão. Com
> quatro semanas de histórico, aparece o padrão: cheio entre 8h e 11h, vazio de
> madrugada."

Toque numa faixa e mostre o número. Aponte as células tracejadas:

> "Estas não têm dados suficientes. Preferimos deixar em branco a pintar de
> azul-claro e fingir que estava vazio."

### 6. A defesa contra falha (1 min)

Aba **Sensores**.

> "O sistema também vigia a si mesmo. Ele acusa três tipos de defeito: sensor
> oscilando, sensor que parou de reagir e vaga ocupada há tempo demais para ser
> verdade — cada um com o que fazer a respeito."

### 7. Fecho (30 s)

> "A maquete valida o sistema. O sistema não depende da maquete. Trocar os 16
> sensores infravermelhos por sensores reais no estacionamento do campus é
> mudar a fonte de eventos — nada do que vocês viram na tela mudaria."

---

## Se algo der errado

| Problema | O que fazer, sem parar a apresentação |
|---|---|
| Um sensor não responde | não conserte na hora: mostre a tela **Sensores** acusando o defeito. Vira demonstração da Fase 4. |
| A placa não conecta | `FONTE_EVENTOS=simulador` e siga. É o item 4 do roteiro, antecipado. |
| O Wi-Fi do local interfere | roteador próprio, canal fixo, longe do projetor. |
| O app não conecta | confira se o celular está na rede do roteador; o endereço aparece na aba **Sensores**. |
| O banco não sobe | `PERSISTENCIA=memoria` — perde-se o mapa de calor, o resto funciona. |

Nenhum desses é gambiarra. A capacidade de trocar de fonte no meio da
apresentação **é** o resultado principal do projeto, e usá-la é demonstrá-la.
