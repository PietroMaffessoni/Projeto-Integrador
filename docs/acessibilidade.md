# Acessibilidade das cores

O CLAUDE.md determina, na seção 10:

> Vermelho e verde é o pior par possível para daltonismo (~8% dos homens). Além
> da cor, vaga ocupada deve ter um segundo indicador visual: hachura diagonal ou
> ícone.

Este documento mostra o que aconteceu quando essa afirmação foi medida em vez de
aceitada — e o que mudou por causa disso.

---

## A medição

Distância entre cores sob simulação de daltonismo, em ΔE no espaço OKLab (×100).
A referência de projeto usada é **ΔE ≥ 8** para duas cores serem consideradas
distinguíveis; abaixo de 6 elas são praticamente a mesma cor.

| Par | Uso | ΔE deuteranopia | Veredito |
|---|---|---:|---|
| `#0ca30c` / `#d03b3b` | verde e vermelho "naturais" | **4,1** | reprovado |
| `#4cc24c` / `#9c1c1c` | **o que o app usa** (claro) | **26,2** | aprovado |
| `#63dd63` / `#b23a3a` | **o que o app usa** (escuro) | **27,1** | aprovado |

O par intuitivo — o verde e o vermelho que qualquer um escolheria — separa 4,1.
Para 8% dos homens, uma vaga livre e uma ocupada seriam *a mesma cor*. O
CLAUDE.md estava certo, e agora há número.

---

## A correção

A convenção do semáforo é forte demais para ser jogada fora num aplicativo de
estacionamento: verde precisa significar livre. Então as duas famílias de cor
foram mantidas e afastadas **na luminosidade** — verde claro contra vermelho
escuro.

```
LIVRE    #4cc24c   claro   (escuro: #63dd63)
OCUPADA  #9c1c1c   escuro  (escuro: #b23a3a)
OFFLINE  #8b8b86   cinza dessaturado
```

Quem enxerga as cores continua lendo "verde e vermelho". Quem não enxerga lê
"claro e escuro" — que é uma diferença que a deuteranopia não apaga. A separação
foi de 4,1 para 26,2 sem trocar o significado de nenhuma cor.

O cinza do `OFFLINE` é dessaturado de propósito: ele não é um terceiro estado no
mesmo eixo dos outros dois, é a ausência de informação, e deve parecer apagado.

---

## O segundo canal

Cor nenhuma decide sozinha no app. Cada estado carrega três sinais:

| Estado | Cor | Textura | Texto |
|---|---|---|---|
| Livre | verde claro | preenchimento sólido | rótulo `Livre` na legenda |
| Ocupada | vermelho escuro | **hachura diagonal a 45°** | rótulo `Ocupada` |
| Sem informação | cinza | **pontilhado** | rótulo `Sem informação` |

A textura está no mapa
([`MapaEstacionamento.tsx`](../app/src/componentes/MapaEstacionamento.tsx)) e se
repete na legenda ([`Legenda.tsx`](../app/src/componentes/Legenda.tsx)) — não
adianta a hachura existir no mapa se a legenda mostra só quadradinhos coloridos.

Além disso, **cada vaga exibe o próprio identificador** (`A3`, `B7`) dentro do
polígono, e o painel de detalhe abre com ícone e texto do estado. Nenhuma
informação do aplicativo depende de distinguir matizes.

---

## O mapa de calor

O mapa de calor da tela de ocupação usa encoding **sequencial**: uma única matiz
(azul), do claro ao escuro. Não é arco-íris porque o dado é magnitude contínua —
matizes diferentes sugeririam categorias diferentes onde só existe "mais" e
"menos" ocupado.

Faixas com pouca observação não são pintadas de azul-claro como se estivessem
vazias: ficam **sem preenchimento, com contorno tracejado**. A distinção entre
"estava livre" e "não sabemos" é a mesma que separa `LIVRE` de `OFFLINE` no mapa
principal, e vale nos dois lugares.

---

## Alvos de toque

Toda área tocável tem pelo menos 44 × 44 pt: pílulas de filtro, células do mapa
de calor, botões do painel. As vagas no SVG são maiores que isso na escala em que
o mapa é renderizado.

---

## Como reproduzir a medição

O validador usado está na skill de visualização de dados, mas a conta é pública:
converter para OKLab, aplicar a matriz de simulação de deuteranopia e medir a
distância euclidiana ×100.

```bash
node scripts/validate_palette.js "#4cc24c,#9c1c1c" --mode light --surface "#fcfcfb"
```

Qualquer alteração na paleta do app deve refazer essa verificação antes de
entrar. É barato, é objetivo, e evita discussão de gosto sobre uma questão que
tem resposta numérica.
