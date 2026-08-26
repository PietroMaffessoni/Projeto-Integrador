# Calibração dos sensores

O TCRT5000 não mede distância: ele mede **quanta luz infravermelha volta**. Isso
depende da cor do carrinho, da altura do sensor no berço, da limpeza da lente e
da iluminação do ambiente. Por isso a calibração não é opcional, e não pode ser
feita em casa para valer no auditório.

> **Calibre no local da apresentação, com a iluminação que vai estar ligada na
> hora.** Iluminação ambiente forte satura o receptor — o sensor passa a ver
> "claro" o tempo todo e nunca detecta o carrinho.

---

## Modo calibração

Descomente a linha no [`platformio.ini`](../firmware/platformio.ini):

```ini
build_flags =
    -D VERSAO_FIRMWARE=\"1.0.0\"
    -D MODO_CALIBRACAO=1
```

Grave e abra o monitor serial:

```bash
pio run -t upload
pio device monitor
```

Neste modo o firmware **não publica nada**: só imprime as 16 leituras, três
vezes por segundo.

```
A: A1=. A2=. A3=# A4=. A5=. A6=. A7=. A8=.  | B: B1=. ...  [cru A=0xFB B=0xFF]
```

`#` é vaga ocupada, `.` é vaga livre. O byte cru no fim ajuda a identificar um
canal preso.

---

## Procedimento, sensor a sensor

Para cada uma das 16 vagas:

1. **Vaga vazia.** Gire o trimpot do LM393 até o caractere virar `.` e ficar
   estável. Se oscilar entre `.` e `#` sozinho, o limiar está bem em cima do
   ponto de comutação — continue girando na mesma direção.
2. **Ponha o carrinho.** O caractere deve virar `#` imediatamente.
3. **Volte meia volta na direção do "vazio".** Isso afasta o limiar do ponto de
   comutação e dá margem para a variação de iluminação ao longo do dia.
4. **Repita com dois carrinhos diferentes** — um claro e um escuro. Carrocerias
   escuras refletem menos, e o limiar precisa funcionar para as duas.
5. **Passe a mão a 20 cm acima da vaga.** Se o caractere mudar, o limiar está
   sensível demais: a sombra de alguém em volta da maquete vai gerar evento
   falso.

---

## Sintomas e causas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Todas as vagas aparecem ocupadas | os pinos do PCF8574 não foram postos em modo entrada, ou o par SDA/SCL está trocado | conferir `sensores::iniciar()`; medir 3,3 V em SDA e SCL em repouso |
| Uma vaga sempre ocupada | lente suja, ou o berço deixou o sensor alto demais | limpar com álcool isopropílico; conferir se a plaquinha assentou no berço |
| Uma vaga sempre livre | fio OUT solto no conector JST | testar continuidade do conector até o pino do expansor |
| Vaga oscila sozinha | limiar em cima do ponto de comutação | meia volta no trimpot na direção do "vazio" |
| Vagas vizinhas mudam juntas | dois fios OUT trocados no expansor | conferir a ordem dos conectores; a tabela está no [README da maquete](../maquete/README.md) |
| Tudo funciona em casa e falha no auditório | iluminação ambiente | recalibrar no local, com as luzes da apresentação ligadas |
| `I2C sem resposta` no serial | alimentação, endereço ou cabo | conferir 3,3 V nos expansores e os jumpers A0/A1/A2 |

---

## O sistema também acusa sozinho

Depois de calibrado, o backend continua vigiando. A tela **Sensores** do app
mostra o que ele concluiu a partir do histórico:

- **Sensor oscilando** — 12 ou mais mudanças em 5 minutos. É exatamente o
  sintoma do limiar mal ajustado, detectado sem ninguém estar olhando.
- **Sensor sem reagir** — nenhuma transição em 24 h enquanto o resto do
  estacionamento se moveu dezenas de vezes. Silêncio sozinho não acusa nada (o
  firmware só publica na mudança); o que denuncia é a inércia *comparada*.
- **Ocupação longa demais** — mais de 12 h ocupada sem interrupção. Costuma ser
  lente suja ou algo apoiado sobre o furo.

Vale a pena abrir essa tela depois da calibração e antes da apresentação: ela é
a conferência independente do trabalho manual que acabou de ser feito.

---

## Depois de calibrar

Comente de volta o `-D MODO_CALIBRACAO=1`, grave o firmware normal e confirme no
app que as 16 vagas responderam. Só então feche a maquete.
