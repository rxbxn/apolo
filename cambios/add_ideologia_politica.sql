-- =====================================================
--  MIGRACIÓN: Agregar columna ideologia_politica
--  Valores permitidos: 'Izquierda', 'Centro', 'Derecha'
-- =====================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ideologia_politica TEXT
    CHECK (ideologia_politica IN ('Izquierda', 'Centro', 'Derecha'));

COMMENT ON COLUMN usuarios.ideologia_politica IS 'Orientación política declarada: Izquierda, Centro o Derecha';
