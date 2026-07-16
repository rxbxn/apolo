-- ============================================================================
-- Catálogos simples para los selects de "Solicitudes de Elementos"
-- (Gestión Gerencial → Nuevo formulario)
-- ============================================================================
-- Ejecutar en: Supabase Studio → SQL Editor (VPS 72.61.64.225)
--
-- Por qué:
-- Los selects de Elemento/Unidad/Categoría/Sector en
-- components/management/gestion-form-new.tsx dependían de derivar valores
-- distintos desde `catalogo_gestion`, una tabla pensada para otra cosa (cada
-- fila es un "ítem completo": elemento+unidad+categoria+sector juntos, no
-- una lista independiente por campo). El select de Elemento además leía de
-- una tabla `elementos` huérfana, sin ningún panel de administración.
--
-- Estas 4 tablas nuevas son catálogos independientes de un solo campo
-- (nombre), cada una administrable desde Configuración → Gestión Gerencial,
-- para que el usuario pueda agregar/editar/borrar los valores que aparecen
-- en cada select sin tener que crear un "elemento" completo cada vez.
-- ============================================================================

CREATE TABLE IF NOT EXISTS gestion_elementos (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     TEXT NOT NULL UNIQUE,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gestion_unidades (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     TEXT NOT NULL UNIQUE,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gestion_categorias (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     TEXT NOT NULL UNIQUE,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gestion_sectores (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     TEXT NOT NULL UNIQUE,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Semillas iniciales sugeridas (ajustar/borrar libremente desde el panel de
-- Configuración una vez creadas las tablas). ON CONFLICT evita duplicados si
-- se corre este script más de una vez.
INSERT INTO gestion_unidades (nombre) VALUES
    ('Unidades'), ('Cajas'), ('Paquetes'), ('Kits')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO gestion_categorias (nombre) VALUES
    ('Tecnología'), ('Oficina'), ('Logística'), ('Publicidad')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO gestion_sectores (nombre) VALUES
    ('Administración'), ('Operaciones'), ('Comunicación')
ON CONFLICT (nombre) DO NOTHING;

-- Verificación
SELECT 'gestion_elementos' AS tabla, count(*) FROM gestion_elementos
UNION ALL
SELECT 'gestion_unidades', count(*) FROM gestion_unidades
UNION ALL
SELECT 'gestion_categorias', count(*) FROM gestion_categorias
UNION ALL
SELECT 'gestion_sectores', count(*) FROM gestion_sectores;
