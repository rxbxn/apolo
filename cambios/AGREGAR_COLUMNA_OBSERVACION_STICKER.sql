-- ============================================================
--  AGREGAR COLUMNA FALTANTE: observacion_verificacion_sticker
--  Ejecutar en: https://72-61-64-225.sslip.io/project/default → SQL Editor
-- ============================================================
--
-- El formulario de edición de Personas (sección "Verificación de Sticker",
-- components/personas/form-sections/datos-personales.tsx) ya tiene el campo
-- "observacion_verificacion_sticker" y lo envía en CADA guardado (crear o
-- actualizar) vía lib/hooks/use-personas.ts, que hace un .update()/.insert()
-- directo contra la tabla `usuarios`. Esa tabla real en producción no tiene
-- esta columna (aunque sí está en el esquema propuesto schema_apolo_v2.sql),
-- así que cada guardado de una persona probablemente está fallando por un
-- error de Postgres "column does not exist".
--
-- Nota: esto es DISTINTO de la columna "OBSERVACIÓN VERIFICACIÓN STICKER"
-- que se quitó del Excel de Importar/Exportar (esa era del import masivo,
-- confusa y siempre vacía). Esta es del formulario de edición individual,
-- donde sí tiene sentido — no se vuelve a tocar el Excel.

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS observacion_verificacion_sticker TEXT;

-- Verificación
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name IN ('verificacion_sticker', 'fecha_verificacion_sticker', 'nombre_verificador', 'observacion_verificacion_sticker')
ORDER BY column_name;
