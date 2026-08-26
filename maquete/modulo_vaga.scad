/*
 * Módulo de duas vagas — maquete 1:64
 * ===================================
 *
 * Uma peça de 80 × 127,5 mm contendo duas vagas lado a lado mais a metade do
 * corredor à frente delas. São necessárias oito peças idênticas: um único STL
 * impresso oito vezes (CLAUDE.md, seção 4).
 *
 *   4 módulos × 80 mm = 320 mm de fileira, × 2 fileiras encostadas pelo corredor
 *   2 × 127,5 mm + 25 mm de calçada de fundo + 25 mm da outra ponta = 305 mm
 *
 * Por que módulos e não uma placa única: mesa da impressora pequena, risco de
 * empenamento numa peça de 34 cm e fila de impressora — se uma peça falhar,
 * reimprime-se 3 h, não 24 h.
 *
 * Como gerar o STL:
 *   openscad -o modulo_vaga.stl -D "peca=\"modulo\"" modulo_vaga.scad
 *   openscad -o calcada.stl     -D "peca=\"calcada\"" modulo_vaga.scad
 *
 * Ou abra no OpenSCAD, escolha a peça na variável abaixo e tecle F6, F7.
 */

// Qual peça gerar: "modulo", "calcada" ou "conjunto" (só para conferir o encaixe)
peca = "modulo";

/* ------------------------------------------------------------------ Cotas --
 * Todas derivadas de medidas reais divididas por 64.
 */
VAGA_LARGURA     = 40;      // 2,5 m reais
VAGA_PROFUNDIDADE = 80;     // 5,0 m reais
CORREDOR         = 95;      // 6,0 m reais — o módulo carrega metade
CALCADA          = 25;      // 1,6 m reais
FAIXA_LARGURA    = 2;       // 12 cm reais
FAIXA_PROFUNDIDADE = 0.6;   // rebaixo, não ressalto: ressalto vira degrau

MODULO_LARGURA   = VAGA_LARGURA * 2;            // 80
MODULO_COMPRIMENTO = VAGA_PROFUNDIDADE + CORREDOR / 2;  // 127,5
ESPESSURA        = 3;       // rígido o bastante em PLA sem gastar filamento

/* --------------------------------------------------------------- Sensores --
 * O furo fica a 30 mm da borda do corredor — e não no centro geométrico da
 * vaga. Motivo prático: o Hot Wheels tem vão entre os eixos, e um sensor no
 * centro exato enxerga o chão por baixo do carrinho. A 30 mm da frente, o
 * sensor fica sob a região sempre sólida da carroceria.
 */
SENSOR_DISTANCIA_CORREDOR = 30;

// Corpo do TCRT5000 (10,2 × 5,8 mm) mais 0,4 mm de folga por lado
SENSOR_FURO_X    = 11;
SENSOR_FURO_Y    = 6.6;

// Berço para a plaquinha do módulo comparador, na face inferior
BERCO_X          = 34.4;    // placa de 34 mm + 0,4 de folga
BERCO_Y          = 16.4;
BERCO_PROFUNDIDADE = 1.6;

/* ----------------------------------------------------------------- Cabos ---
 * Canaleta na face inferior, saindo pelo lado da calçada: os fios nunca cruzam
 * o corredor, onde ficariam à vista na foto e no vídeo da defesa.
 */
CANALETA        = 6;        // 6 × 6 mm

/* ---------------------------------------------------------------- Encaixe --
 * Cauda de andorinha com 0,3 mm de folga. Sem folga, duas peças em PLA não
 * entram uma na outra depois da contração da primeira camada.
 */
RABO_PROFUNDIDADE = 6;
RABO_BASE       = 10;
RABO_TOPO       = 16;
RABO_FOLGA      = 0.3;

$fn = 48;

/* =========================================================== Geometria === */

// Posição do centro de cada sensor, medida do fundo (lado da calçada)
function y_sensor() = VAGA_PROFUNDIDADE - SENSOR_DISTANCIA_CORREDOR;
function x_vaga(i)  = VAGA_LARGURA * i + VAGA_LARGURA / 2;   // i = 0 ou 1

/** Perfil da cauda de andorinha, deitado no plano XY e extrudado em Z. */
module perfil_rabo(folga = 0) {
  meia_base = RABO_BASE / 2 + folga;
  meio_topo = RABO_TOPO / 2 + folga;
  profundidade = RABO_PROFUNDIDADE + folga;

  polygon(points = [
    [-meia_base, 0],
    [ meia_base, 0],
    [ meio_topo, profundidade],
    [-meio_topo, profundidade],
  ]);
}

/** Macho: sobra na face direita (x = MODULO_LARGURA). */
module rabo_macho() {
  translate([MODULO_LARGURA, MODULO_COMPRIMENTO / 2, 0])
    rotate([0, 0, -90])
      linear_extrude(height = ESPESSURA)
        perfil_rabo(0);
}

/** Fêmea: falta na face esquerda (x = 0), com folga para o macho entrar. */
module rabo_femea() {
  translate([0, MODULO_COMPRIMENTO / 2, -0.1])
    rotate([0, 0, -90])
      linear_extrude(height = ESPESSURA + 0.2)
        perfil_rabo(RABO_FOLGA);
}

/** Rebaixo de 0,6 mm que desenha a faixa demarcatória na superfície. */
module faixa(x, y, largura, comprimento) {
  translate([x, y, ESPESSURA - FAIXA_PROFUNDIDADE])
    cube([largura, comprimento, FAIXA_PROFUNDIDADE + 0.1]);
}

module faixas_do_modulo() {
  // Duas vagas encostadas compartilham a faixa entre elas: ela é desenhada uma
  // vez só, centrada na divisa, metade em cada vaga.
  faixa(VAGA_LARGURA - FAIXA_LARGURA / 2, 0, FAIXA_LARGURA, VAGA_PROFUNDIDADE);

  // Faixas das bordas laterais: cada módulo desenha metade, e a outra metade
  // vem do módulo vizinho — o resultado montado tem faixas de 2 mm uniformes.
  faixa(0, 0, FAIXA_LARGURA / 2, VAGA_PROFUNDIDADE);
  faixa(MODULO_LARGURA - FAIXA_LARGURA / 2, 0, FAIXA_LARGURA / 2, VAGA_PROFUNDIDADE);

  // Linha da frente, onde a vaga encontra o corredor
  faixa(0, VAGA_PROFUNDIDADE - FAIXA_LARGURA, MODULO_LARGURA, FAIXA_LARGURA);
}

module furos_e_bercos() {
  for (i = [0, 1]) {
    x = x_vaga(i);
    y = y_sensor();

    // Furo passante por onde o TCRT5000 enxerga o carrinho
    translate([x - SENSOR_FURO_X / 2, y - SENSOR_FURO_Y / 2, -0.1])
      cube([SENSOR_FURO_X, SENSOR_FURO_Y, ESPESSURA + 0.2]);

    // Berço da plaquinha, aberto para baixo
    translate([x - BERCO_X / 2, y - BERCO_Y / 2, -0.1])
      cube([BERCO_X, BERCO_Y, BERCO_PROFUNDIDADE + 0.1]);

    // Canaleta do berço até a borda do fundo (lado da calçada)
    translate([x - CANALETA / 2, -0.1, -0.1])
      cube([CANALETA, y + BERCO_Y / 2, CANALETA / 2]);
  }
}

module modulo_vaga() {
  difference() {
    union() {
      cube([MODULO_LARGURA, MODULO_COMPRIMENTO, ESPESSURA]);
      rabo_macho();
    }

    rabo_femea();
    faixas_do_modulo();
    furos_e_bercos();
  }
}

/** Tira reta de calçada, 25 mm de largura. Comprimento livre. */
module calcada(comprimento = 80) {
  ALTURA_MEIO_FIO = 1.2;  // 7,7 cm reais — meio-fio baixo, de estacionamento

  union() {
    cube([comprimento, CALCADA, ESPESSURA]);
    // Meio-fio na borda que dá para o asfalto
    translate([0, CALCADA - 1.5, ESPESSURA])
      cube([comprimento, 1.5, ALTURA_MEIO_FIO]);
  }
}

/** Só para conferir o encaixe antes de mandar imprimir oito vezes. */
module conjunto_de_conferencia() {
  for (i = [0, 1]) {
    translate([i * MODULO_LARGURA, 0, 0]) modulo_vaga();
  }
  translate([0, -CALCADA - 2, 0]) calcada(MODULO_LARGURA * 2);
}

/* ============================================================== Saída ==== */

if (peca == "modulo")        modulo_vaga();
else if (peca == "calcada")  calcada(80);
else if (peca == "conjunto") conjunto_de_conferencia();
else                         modulo_vaga();
