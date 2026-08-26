-- Aditivo ao schema da Fase 0. Nada aqui altera colunas existentes.
--
-- Motivo: "honestidade de estado" (CLAUDE.md, seção 10) precisa sobreviver a um
-- restart do backend. Sem persistir o último heartbeat, o processo sobe sem
-- memória de quem estava vivo — e a única saída honesta seria marcar tudo
-- OFFLINE mesmo com a placa publicando normalmente.
--
-- `controlador_id` em vagas prepara o caminho da maquete (uma placa) para o
-- estacionamento real (várias placas), sem migração nova depois.

CREATE TABLE IF NOT EXISTS controladores (
  id                VARCHAR(32) PRIMARY KEY,
  online            BOOLEAN     NOT NULL DEFAULT false,
  ultimo_heartbeat  TIMESTAMPTZ,
  rssi              SMALLINT
);

ALTER TABLE vagas
  ADD COLUMN IF NOT EXISTS controlador_id VARCHAR(32) NOT NULL DEFAULT 'placa-01';

CREATE INDEX IF NOT EXISTS idx_vagas_controlador ON vagas (controlador_id);

-- Varreduras por janela de tempo (previsão, anomalias, mapa de calor) não são
-- filtradas por vaga: precisam de um índice só de tempo.
CREATE INDEX IF NOT EXISTS idx_eventos_tempo ON eventos_ocupacao (ocorrido_em DESC);
