-- Schema fechado na Fase 0 (CLAUDE.md, seção 7).
-- A tabela de histórico existe desde a primeira versão: é ela que habilita
-- previsão de ocupação, detecção de sensor defeituoso e mapa de calor temporal.

CREATE TABLE IF NOT EXISTS vagas (
  id            VARCHAR(4) PRIMARY KEY,      -- 'A1'..'B8'
  fileira       CHAR(1) NOT NULL,
  posicao       SMALLINT NOT NULL,
  tipo          VARCHAR(20) DEFAULT 'COMUM', -- COMUM | PCD | IDOSO
  estado        VARCHAR(10) DEFAULT 'OFFLINE',
  atualizado_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS eventos_ocupacao (
  id          BIGSERIAL PRIMARY KEY,
  vaga_id     VARCHAR(4) REFERENCES vagas(id),
  estado      VARCHAR(10) NOT NULL,
  ocorrido_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_vaga_tempo
  ON eventos_ocupacao (vaga_id, ocorrido_em DESC);
