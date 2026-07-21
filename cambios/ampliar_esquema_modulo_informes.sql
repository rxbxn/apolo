-- ============================================================
-- Ampliación de esquema para el módulo Informes (equivalente a Zeus)
-- ============================================================
-- Todo con IF NOT EXISTS / ADD COLUMN IF NOT EXISTS porque el esquema real
-- en producción no siempre coincide exactamente con schema_apolo_v2.sql
-- (ya lo confirmamos varias veces esta sesión) — este script es seguro de
-- correr aunque alguna columna ya exista.

-- ------------------------------------------------------------
-- 1) debate_vehiculo_amigo — Zeus exporta: NRO, DIRIGENTE, COORDINADOR,
--    MILITANTE, PLACA, PROPIEDAD, MARCA, MODELO, CONDUCTOR, CELULAR,
--    ENTREGO_DOC, RECONOCIMIENTO, CAPACIDAD, TIPO
--    La tabla actual solo tiene coordinador_id + propietario (texto libre),
--    sin vínculo a militante/dirigente ni los demás datos del vehículo.
-- ------------------------------------------------------------
ALTER TABLE debate_vehiculo_amigo
  ADD COLUMN IF NOT EXISTS militante_id      UUID REFERENCES militantes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dirigente_id      UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS propiedad         VARCHAR(50),  -- 'Propio' | 'Alquilado' etc.
  ADD COLUMN IF NOT EXISTS marca             VARCHAR(100),
  ADD COLUMN IF NOT EXISTS modelo            VARCHAR(50),
  ADD COLUMN IF NOT EXISTS conductor         VARCHAR(200),
  ADD COLUMN IF NOT EXISTS celular_conductor VARCHAR(30),
  ADD COLUMN IF NOT EXISTS entrego_documento BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconocimiento    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS capacidad         VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_debate_vehiculo_amigo_militante ON debate_vehiculo_amigo (militante_id);
CREATE INDEX IF NOT EXISTS idx_debate_vehiculo_amigo_dirigente ON debate_vehiculo_amigo (dirigente_id);

-- ------------------------------------------------------------
-- 2) debate_publicidad_vehiculo — Zeus exporta: NRO, DIRIGENTE,
--    COORDINADOR, MILITANTE, MODELO, ELEMENTO PUBLICITARIO, FECHA_GESTION,
--    FECHA_INSTALACION. Falta vínculo a militante/dirigente, modelo del
--    vehículo y fecha_gestion (solo existe fecha_instalacion).
-- ------------------------------------------------------------
ALTER TABLE debate_publicidad_vehiculo
  ADD COLUMN IF NOT EXISTS militante_id UUID REFERENCES militantes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dirigente_id UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modelo       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fecha_gestion DATE;

CREATE INDEX IF NOT EXISTS idx_debate_publicidad_vehiculo_militante ON debate_publicidad_vehiculo (militante_id);
CREATE INDEX IF NOT EXISTS idx_debate_publicidad_vehiculo_dirigente ON debate_publicidad_vehiculo (dirigente_id);

-- ------------------------------------------------------------
-- 3) Consolidado Electoral — campos manuales que no existen todavía.
--    (Los totales/porcentajes de ese reporte, como TOTAL LIMPIO,
--    CUMPLIMIENTO, TOTAL INCONSISTENCIAS, se CALCULAN al momento de
--    generar el Excel a partir de estos campos + debate_inconsistencias +
--    militantes.compromiso_*, no se guardan como columnas.)
-- ------------------------------------------------------------
ALTER TABLE militantes
  ADD COLUMN IF NOT EXISTS cruces_externos  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alistado         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS estado_electoral VARCHAR(50);

-- ------------------------------------------------------------
-- 4) Checklist de 10 etapas del coordinador — NO se crea tabla nueva.
--    militante_actividad (creada antes esta sesión, ver
--    apolo-apk/sql/create_militante_actividad.sql) ya es genérica:
--    militante_id × actividad_id × cumplido. Solo hace falta sembrar el
--    catálogo `actividades` con las 10 etapas reales que usa Zeus (si no
--    existen ya con esos nombres exactos, se insertan; si ya existen con
--    nombre distinto, AJUSTA el texto abajo antes de correr).
-- ------------------------------------------------------------
-- estado = 'vigente' porque actividadesService.obtenerActividadesVigentes()
-- (usado en Home/gráficas de la APK) filtra exactamente por ese valor.
INSERT INTO actividades (nombre, estado)
SELECT nombre, 'vigente' FROM (VALUES
  ('Confirmación Datos'),
  ('Confirmación'),
  ('Sticker Inicio'),
  ('Vehículo Amigo'),
  ('Casa Estratégica'),
  ('Publicidad Estratégica'),
  ('Testigo Electoral'),
  ('Jurado'),
  ('Entrega de Invitaciones'),
  ('Entrega Planillas')
) AS etapas(nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM actividades a WHERE a.nombre = etapas.nombre
);

-- Verificación: deberían aparecer las 10 (o más, si ya había otras)
SELECT id, nombre, estado FROM actividades ORDER BY nombre;
