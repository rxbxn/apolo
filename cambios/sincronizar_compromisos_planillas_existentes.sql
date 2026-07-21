-- Backfill único: hasta ahora, subir/editar/borrar una Planilla NUNCA
-- actualizaba compromiso_cautivo/compromiso_marketing/compromiso_impacto de
-- la persona seleccionada — quedaban con lo que se haya puesto a mano en
-- Personas, sin relación con lo realmente reportado en Planillas. Ya se
-- corrigió el código (createPlanilla/createPlanillasBulk/updatePlanilla/
-- deletePlanilla ahora sincronizan automáticamente), pero las planillas que
-- ya estaban cargadas antes del fix nunca dispararon esa sincronización.
-- Este script recalcula, UNA VEZ, todos los totales actuales.

BEGIN;

WITH totales AS (
    SELECT
        militante_id,
        COALESCE(SUM(cautivo), 0)   AS total_cautivo,
        COALESCE(SUM(marketing), 0) AS total_marketing,
        COALESCE(SUM(impacto), 0)   AS total_impacto
    FROM debate_planillas
    WHERE militante_id IS NOT NULL
    GROUP BY militante_id
)
UPDATE militantes m
SET
    compromiso_cautivo   = t.total_cautivo,
    compromiso_marketing = t.total_marketing,
    compromiso_impacto   = t.total_impacto
FROM totales t
WHERE m.id = t.militante_id;

WITH totales AS (
    SELECT
        militante_id,
        COALESCE(SUM(cautivo), 0)   AS total_cautivo,
        COALESCE(SUM(marketing), 0) AS total_marketing,
        COALESCE(SUM(impacto), 0)   AS total_impacto
    FROM debate_planillas
    WHERE militante_id IS NOT NULL
    GROUP BY militante_id
)
UPDATE usuarios u
SET
    compromiso_cautivo   = t.total_cautivo,
    compromiso_marketing = t.total_marketing,
    compromiso_impacto   = t.total_impacto
FROM totales t
JOIN militantes m ON m.id = t.militante_id
WHERE u.id = m.usuario_id;

COMMIT;

-- Verificación: militantes cuyos compromisos ahora coinciden con la suma real
-- de sus planillas. compromiso_cautivo/marketing/impacto son `varchar` en
-- producción (no numéricos), así que se castean con cuidado — si alguna
-- fila tiene basura no numérica vieja (texto que no sea un número), se trata
-- como no-coincidente en vez de reventar la consulta.
SELECT
    m.id AS militante_id,
    m.compromiso_cautivo, m.compromiso_marketing, m.compromiso_impacto,
    COALESCE(SUM(dp.cautivo), 0)   AS suma_real_cautivo,
    COALESCE(SUM(dp.marketing), 0) AS suma_real_marketing,
    COALESCE(SUM(dp.impacto), 0)   AS suma_real_impacto
FROM militantes m
LEFT JOIN debate_planillas dp ON dp.militante_id = m.id
GROUP BY m.id, m.compromiso_cautivo, m.compromiso_marketing, m.compromiso_impacto
HAVING (CASE WHEN m.compromiso_cautivo   ~ '^-?[0-9]+(\.[0-9]+)?$' THEN m.compromiso_cautivo::numeric   ELSE -1 END) <> COALESCE(SUM(dp.cautivo), 0)
    OR (CASE WHEN m.compromiso_marketing ~ '^-?[0-9]+(\.[0-9]+)?$' THEN m.compromiso_marketing::numeric ELSE -1 END) <> COALESCE(SUM(dp.marketing), 0)
    OR (CASE WHEN m.compromiso_impacto   ~ '^-?[0-9]+(\.[0-9]+)?$' THEN m.compromiso_impacto::numeric   ELSE -1 END) <> COALESCE(SUM(dp.impacto), 0)
LIMIT 20;
-- (si esta última consulta no devuelve filas, todo quedó sincronizado correctamente)
