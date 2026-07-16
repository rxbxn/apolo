-- ============================================================================
-- OPCIONAL: permitir centavos en formularios_gestion.autorizacion_total
-- ============================================================================
-- Ejecutar en: Supabase Studio → SQL Editor (VPS 72.61.64.225)
-- Solo si quieres que "Autorización Total" acepte decimales (ej: 1500.50).
--
-- Por qué existe este script:
-- La UI de Gestión Gerencial mostraba el campo con centavos (step 0.01,
-- placeholder "0.00"), como si la columna fuera NUMERIC(15,2) — que es lo
-- que dice schema_apolo_v2.sql. Pero la columna real en producción sigue
-- siendo INTEGER (esa parte de la migración nunca se aplicó ahí), y
-- guardar un valor con decimales tiraba:
--   invalid input syntax for type integer: "0.05"
--
-- Mientras no se corra este script, el formulario valida el campo como
-- entero (sin centavos) para no romper el guardado. Si corres esto, avísame
-- para quitar esa validación y devolverle los centavos al campo.
-- ============================================================================

ALTER TABLE formularios_gestion
    ALTER COLUMN autorizacion_total TYPE NUMERIC(15,2)
    USING autorizacion_total::NUMERIC(15,2);

-- Verificación
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'formularios_gestion' AND column_name = 'autorizacion_total';
