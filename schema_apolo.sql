-- =====================================================================
-- APOLO — ESQUEMA DE BASE DE DATOS (PostgreSQL puro, sin dependencia de Supabase)
-- Generado a partir del análisis de "Personas (78).xlsx" (1485 filas, 42 columnas)
-- y del esquema vivo actual en Supabase (tablas usuarios/militantes/coordinadores/dirigentes).
--
-- Regla de oro del dominio (ver CLAUDE.md del proyecto):
--   Todo registro es un "militante". Un militante puede tener además rol de
--   coordinador o dirigente; si cambia de rol NUNCA se elimina de `militantes`.
--
-- Motor recomendado: PostgreSQL 15+ autoalojado en el VPS (sin el stack de
-- Supabase). Es "más liviano" porque se elimina Auth/Storage/Realtime/Studio
-- de Supabase; a cambio la app asume su propia autenticación (tabla
-- `credenciales` + JWT propio con bcrypt, en vez de `auth.users`).
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid(), crypt() para passwords
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- búsqueda difusa de nombres (ILIKE / similarity)

-- =====================================================================
-- 1. CATÁLOGOS GEOGRÁFICOS Y DE REFERENCIA
-- =====================================================================

CREATE TABLE ciudades (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(150) NOT NULL,
    codigo      VARCHAR(20),
    activo      BOOLEAN NOT NULL DEFAULT true,
    orden       INTEGER,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (nombre)
);

CREATE TABLE localidades (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(150) NOT NULL,
    codigo      VARCHAR(20),
    ciudad_id   UUID REFERENCES ciudades(id) ON DELETE SET NULL,
    activo      BOOLEAN NOT NULL DEFAULT true,
    orden       INTEGER,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (nombre, ciudad_id)
);

CREATE TABLE barrios (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre       VARCHAR(150) NOT NULL,
    codigo       VARCHAR(20),
    localidad_id UUID REFERENCES localidades(id) ON DELETE SET NULL,
    ciudad_id    UUID REFERENCES ciudades(id) ON DELETE SET NULL,
    activo       BOOLEAN NOT NULL DEFAULT true,
    orden        INTEGER,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (nombre, localidad_id)
);

CREATE TABLE zonas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(150) NOT NULL,
    descripcion TEXT,
    codigo      VARCHAR(20),
    color       VARCHAR(20),
    activo      BOOLEAN NOT NULL DEFAULT true,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (nombre)
);

CREATE TABLE niveles_escolaridad (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre  VARCHAR(100) NOT NULL UNIQUE,   -- Primaria, Bachiller, Técnico, Tecnólogo, Universitario, Profesional, Postgrado, Maestría, MBA...
    orden   INTEGER,
    activo  BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tipos_vivienda (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre  VARCHAR(100) NOT NULL UNIQUE,   -- Propia, Familiar, Arriendo
    orden   INTEGER,
    activo  BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catálogo de MEDIOS/CANALES de referenciación (ej: Redes sociales, Evento,
-- Voz a voz, Volanteo). NO debe confundirse con "quién refirió a la persona":
-- eso vive como relación en `usuarios.referido_por_usuario_id` (ver sección 3).
CREATE TABLE tipos_referencia (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo      BOOLEAN NOT NULL DEFAULT true,
    orden       INTEGER,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catálogo de tipos de militante (códigos ya usados en el Excel columna TIPO)
CREATE TABLE tipos_militante (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo      INTEGER NOT NULL UNIQUE,   -- 80001, 80002, 80003, 80004, 80005
    descripcion VARCHAR(100) NOT NULL,
    activo      BOOLEAN NOT NULL DEFAULT true,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO tipos_militante (codigo, descripcion) VALUES
    (80001, 'Militante'),
    (80002, 'Coordinador de Zona'),
    (80003, 'Dirigente'),
    (80004, 'Coordinador Local'),
    (80005, 'Coordinador Municipal');

-- =====================================================================
-- 2. RBAC (perfiles / permisos / módulos) — se conserva el modelo actual
-- =====================================================================

CREATE TABLE perfiles (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre           VARCHAR(100) NOT NULL UNIQUE,
    descripcion      TEXT,
    nivel_jerarquico INTEGER,
    activo           BOOLEAN NOT NULL DEFAULT true,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE modulos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(100) NOT NULL,
    descripcion     TEXT,
    icono           VARCHAR(100),
    ruta            VARCHAR(200),
    orden           INTEGER,
    modulo_padre_id UUID REFERENCES modulos(id) ON DELETE SET NULL,
    activo          BOOLEAN NOT NULL DEFAULT true,
    obligatorio     BOOLEAN NOT NULL DEFAULT false,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permisos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(100) NOT NULL,
    descripcion TEXT,
    codigo      VARCHAR(100) NOT NULL UNIQUE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE perfil_permiso_modulo (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id   UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    modulo_id   UUID NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    permiso_id  UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    condiciones JSONB,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por  UUID,
    UNIQUE (perfil_id, modulo_id, permiso_id)
);

-- =====================================================================
-- 3. USUARIOS — toda persona (militante, coordinador o dirigente) tiene
--    exactamente una fila aquí. Es la tabla ancla de todo el sistema.
-- =====================================================================

CREATE TABLE usuarios (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificación
    tipo_documento           VARCHAR(10) NOT NULL DEFAULT 'CC',
    numero_documento         VARCHAR(30) NOT NULL,      -- obligatoria: un militante sin cédula NO se registra (regla de negocio confirmada)
    nombres                  VARCHAR(150) NOT NULL,
    apellidos                VARCHAR(150) NOT NULL,

    -- Contacto
    email                    VARCHAR(150),
    celular                  VARCHAR(20),
    whatsapp                 VARCHAR(20),
    telefono_fijo            VARCHAR(20),
    direccion                TEXT,

    -- Ubicación
    ciudad_id                UUID REFERENCES ciudades(id) ON DELETE SET NULL,
    localidad_id             UUID REFERENCES localidades(id) ON DELETE SET NULL,
    barrio_id                UUID REFERENCES barrios(id) ON DELETE SET NULL,
    zona_id                  UUID REFERENCES zonas(id) ON DELETE SET NULL,
    lugar_nacimiento         VARCHAR(150),
    latitud                  DOUBLE PRECISION,
    longitud                 DOUBLE PRECISION,
    ubicacion_manual         TEXT,                      -- dirección escrita a mano cuando no hay match geográfico

    -- Demográficos
    fecha_nacimiento         DATE,
    genero                   VARCHAR(20) CHECK (genero IN ('Hombre', 'Mujer', 'Otro')),
    estado_civil             VARCHAR(30),
    numero_hijos             INTEGER NOT NULL DEFAULT 0,
    nivel_escolaridad_id     UUID REFERENCES niveles_escolaridad(id) ON DELETE SET NULL,
    perfil_ocupacion         VARCHAR(150),
    tipo_vivienda_id         UUID REFERENCES tipos_vivienda(id) ON DELETE SET NULL,
    talla_camisa             VARCHAR(10),
    ideologia_politica       VARCHAR(100),
    grupo_etnico             VARCHAR(100),               -- columna POBLACION del Excel

    -- Redes sociales
    facebook                 VARCHAR(150),
    instagram                VARCHAR(150),
    twitter                  VARCHAR(150),

    -- Referenciación: quién trajo/recomendó a esta persona al movimiento.
    -- Se resuelve por nombre contra `usuarios` cuando el referente también
    -- está registrado; si no, queda como texto libre (85 de 118 referentes
    -- del Excel no son militantes registrados).
    referido_por_usuario_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    referido_por_nombre      VARCHAR(150),
    referido_por_telefono    VARCHAR(20),
    tipo_referencia_id       UUID REFERENCES tipos_referencia(id) ON DELETE SET NULL,

    -- Contacto familiar de emergencia
    nombre_familiar_cercano    VARCHAR(150),
    celular_familiar_cercano   VARCHAR(20),

    -- Compromiso / verificación de material (sticker)
    verificacion_sticker         BOOLEAN,
    fecha_verificacion_sticker   DATE,
    observacion_verificacion     TEXT,
    nombre_verificador            VARCHAR(150),
    beneficiario                  VARCHAR(150),

    -- Otros
    cargo_actual              VARCHAR(150),
    observaciones              TEXT,

    -- Autenticación / auditoría
    ultimo_acceso              TIMESTAMPTZ,
    estado                      VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    creado_en                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en                TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por                   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por               UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_usuarios_numero_documento ON usuarios (numero_documento);
CREATE INDEX idx_usuarios_nombre_trgm ON usuarios USING gin ((nombres || ' ' || apellidos) gin_trgm_ops);
CREATE INDEX idx_usuarios_ciudad ON usuarios (ciudad_id);
CREATE INDEX idx_usuarios_zona ON usuarios (zona_id);
CREATE INDEX idx_usuarios_estado ON usuarios (estado);
CREATE INDEX idx_usuarios_referido_por ON usuarios (referido_por_usuario_id);

-- =====================================================================
-- 4. CREDENCIALES — reemplaza a `auth.users` de Supabase.
--    Solo coordinadores/dirigentes/admin inician sesión; un militante base
--    normalmente no tiene fila aquí.
-- =====================================================================

CREATE TABLE credenciales (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id     UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,                 -- bcrypt/argon2, generado por la app
    rol            VARCHAR(30) NOT NULL DEFAULT 'coordinador' CHECK (rol IN ('admin', 'dirigente', 'coordinador')),
    activo         BOOLEAN NOT NULL DEFAULT true,
    debe_cambiar_password BOOLEAN NOT NULL DEFAULT true,
    ultimo_acceso  TIMESTAMPTZ,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credenciales_email ON credenciales (email);

-- =====================================================================
-- 5. COORDINADORES — personas con rol coordinador/dirigente.
--    `referencia_coordinador_id` = quién los reclutó/introdujo (jerarquía
--    de reclutamiento, distinta de `dirigentes` que es jerarquía de mando).
-- =====================================================================

CREATE TABLE coordinadores (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id                  UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    credencial_id               UUID UNIQUE REFERENCES credenciales(id) ON DELETE SET NULL,
    email                       VARCHAR(150),
    perfil_id                   UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    tipo                        VARCHAR(50),   -- 'zona' | 'local' | 'municipal' (deriva de tipos_militante 80002/80004/80005)
    referencia_coordinador_id   UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
    estado                      VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    creado_en                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coordinadores_usuario ON coordinadores (usuario_id);
CREATE INDEX idx_coordinadores_referencia ON coordinadores (referencia_coordinador_id);
CREATE INDEX idx_coordinadores_estado ON coordinadores (estado);

-- =====================================================================
-- 6. DIRIGENTES — jerarquía de mando: qué coordinador reporta a qué dirigente.
--    Ambos extremos son filas de `coordinadores` (un dirigente ES un
--    coordinador con perfil superior, según la regla de doble rol).
-- =====================================================================

CREATE TABLE dirigentes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_dirigente   UUID NOT NULL REFERENCES coordinadores(id) ON DELETE CASCADE,
    id_coordinador UUID NOT NULL REFERENCES coordinadores(id) ON DELETE CASCADE,
    fecha_inicio   DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin      DATE,
    activo         BOOLEAN NOT NULL DEFAULT true,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (id_dirigente <> id_coordinador),
    UNIQUE (id_dirigente, id_coordinador)
);

CREATE INDEX idx_dirigentes_coordinador ON dirigentes (id_coordinador);
CREATE INDEX idx_dirigentes_dirigente ON dirigentes (id_dirigente);

-- =====================================================================
-- 7. MILITANTES — TODA persona registrada tiene una fila aquí, incluso si
--    además es coordinador/dirigente (regla de doble rol, ver CLAUDE.md).
-- =====================================================================

CREATE TABLE militantes (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id            UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_militante_id     UUID REFERENCES tipos_militante(id) ON DELETE SET NULL,
    coordinador_id        UUID REFERENCES coordinadores(id) ON DELETE SET NULL,

    -- Compromisos (columna en el Excel: COMP. DIFUSIÓN/MARKETING/IMPACTO/CAUTIVO/PROYECTO)
    compromiso_difusion   INTEGER NOT NULL DEFAULT 0,
    compromiso_marketing  INTEGER NOT NULL DEFAULT 0,
    compromiso_impacto    INTEGER NOT NULL DEFAULT 0,
    compromiso_cautivo    INTEGER NOT NULL DEFAULT 0,
    compromiso_proyecto   VARCHAR(50),   -- 'Gestión Privada' | 'Gestión a Futuro' | 'Gestión Laboral' | 'Gestión Institucional' | 'Gestión Jurídica' | 'Gestión de Estudios'

    formulario            JSONB,          -- respuestas de formularios dinámicos asociados
    estado                 VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    creado_en               TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_militantes_coordinador ON militantes (coordinador_id);
CREATE INDEX idx_militantes_tipo ON militantes (tipo_militante_id);
CREATE INDEX idx_militantes_estado ON militantes (estado);

-- =====================================================================
-- 8. GESTIÓN GERENCIAL (formularios de solicitud) — se conserva el modelo
--    ya validado en producción, solo se ajustan los FKs a este esquema.
-- =====================================================================

CREATE TABLE catalogo_gestion (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo        VARCHAR(50) NOT NULL,   -- 'elemento' | 'unidad' | 'categoria' | 'sector' | 'tipo_gestion'
    codigo      VARCHAR(50),
    nombre      VARCHAR(200) NOT NULL,
    descripcion TEXT,
    activo      BOOLEAN NOT NULL DEFAULT true,
    orden       INTEGER NOT NULL DEFAULT 1,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE formularios_gestion (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_formulario        VARCHAR(50) NOT NULL UNIQUE,
    fecha_necesidad          DATE NOT NULL,
    prioridad                VARCHAR(20) CHECK (prioridad IN ('alta', 'media', 'baja')),

    militante_id             UUID REFERENCES militantes(id) ON DELETE SET NULL,
    dirigente_id             UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
    coordinador_id           UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
    telefono                 VARCHAR(20),
    localidad                VARCHAR(100),
    receptor                 VARCHAR(100),

    estado_difusion          VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    limpio_conteo            INTEGER NOT NULL DEFAULT 0,
    limpio_pendiente         INTEGER NOT NULL DEFAULT 0,
    codigo_lider             VARCHAR(50),

    tipo_gestion              VARCHAR(100),
    gestor_asignado           VARCHAR(200),
    detalle_solicitud          TEXT,

    autorizacion_total         NUMERIC(15,2) NOT NULL DEFAULT 0,
    fecha_entrega               DATE,
    observaciones_prioridad     TEXT,
    observaciones_generales      TEXT,

    estado                       VARCHAR(30) NOT NULL DEFAULT 'borrador'
                                  CHECK (estado IN ('borrador', 'enviado', 'en_proceso', 'aprobado', 'rechazado', 'completado')),

    creado_por                    UUID REFERENCES credenciales(id) ON DELETE SET NULL,
    aprobado_por                   UUID REFERENCES credenciales(id) ON DELETE SET NULL,
    creado_en                       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE solicitudes_gestion (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    formulario_id  UUID NOT NULL REFERENCES formularios_gestion(id) ON DELETE CASCADE,
    elemento       VARCHAR(200),
    unidad         VARCHAR(100),
    categoria      VARCHAR(100),
    sector         VARCHAR(100),
    cantidad       INTEGER NOT NULL DEFAULT 0,
    orden          INTEGER NOT NULL DEFAULT 1,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_formularios_gestion_militante ON formularios_gestion (militante_id);
CREATE INDEX idx_formularios_gestion_coordinador ON formularios_gestion (coordinador_id);
CREATE INDEX idx_solicitudes_gestion_formulario ON solicitudes_gestion (formulario_id, orden);

-- =====================================================================
-- 9. STAGING — carga cruda del Excel "Personas 78" para el ETL.
--    Se llena 1:1 con las columnas originales (todo texto) y luego un
--    script de normalización puebla `usuarios` / `militantes` /
--    `coordinadores` / `dirigentes`. No usar en producción como fuente
--    de verdad; se conserva como bitácora de importación.
-- =====================================================================

CREATE TABLE stg_personas_excel (
    fila_excel                  INTEGER PRIMARY KEY,   -- columna ID del Excel
    cedula                      TEXT,
    estado                      TEXT,
    fecha                       TEXT,
    nombre_completo              TEXT,
    coordinador                  TEXT,
    dirigente                    TEXT,
    tipo                          TEXT,                -- código crudo: puede venir sucio ("0", "80001-02")
    talla                          TEXT,
    lugar_nacimiento               TEXT,
    direccion                      TEXT,
    telefono_fijo                  TEXT,
    ciudad                          TEXT,
    barrio                          TEXT,
    localidad                       TEXT,
    nacimiento                      TEXT,
    genero                           TEXT,
    email                             TEXT,
    referencia                        TEXT,
    tel_referencia                     TEXT,
    vivienda                            TEXT,
    facebook                             TEXT,
    instagram                             TEXT,
    twitter                                TEXT,
    whatsapp                                TEXT,
    estudios                                 TEXT,
    ocupacion                                 TEXT,
    comp_difusion                              TEXT,
    comp_marketing                              TEXT,
    comp_impacto                                 TEXT,
    comp_cautivo                                  TEXT,
    comp_proyecto                                  TEXT,
    verificacion_sticker                            TEXT,
    fecha_verificacion_sticker                       TEXT,
    observacion_verificacion_sticker                  TEXT,
    nombre_verificador                                 TEXT,
    beneficiario                                        TEXT,
    poblacion                                            TEXT,
    ubicacion                                             TEXT,
    hijos                                                  TEXT,
    ideologia                                               TEXT,
    telefono_sin_verificar                                   TEXT,  -- columna "NO SE DE DONDE SALE ESTE NUMERO"
    procesado                                                 BOOLEAN NOT NULL DEFAULT false,
    usuario_id_generado                                        UUID REFERENCES usuarios(id),
    error_procesamiento                                         TEXT
);

-- =====================================================================
-- 10. TRIGGERS: actualizado_en automático
-- =====================================================================

CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'ciudades','localidades','barrios','zonas','perfiles','modulos',
        'usuarios','credenciales','coordinadores','militantes',
        'formularios_gestion'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%I_actualizado_en BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();', t, t
        );
    END LOOP;
END $$;

-- =====================================================================
-- 11. VISTAS DE CONSULTA (equivalentes a v_militantes_completo /
--     v_coordinadores_completo que ya usa el frontend)
-- =====================================================================

CREATE OR REPLACE VIEW v_militantes_completo AS
SELECT
    m.id AS militante_id,
    m.usuario_id,
    tm.codigo AS tipo_codigo,
    tm.descripcion AS tipo_descripcion,
    m.coordinador_id,
    m.compromiso_difusion,
    m.compromiso_marketing,
    m.compromiso_cautivo,
    m.compromiso_impacto,
    m.compromiso_proyecto,
    m.estado,
    m.creado_en,
    m.actualizado_en,
    u.nombres,
    u.apellidos,
    u.tipo_documento,
    u.numero_documento,
    u.email,
    u.celular,
    u.whatsapp,
    u.telefono_fijo,
    u.direccion,
    u.fecha_nacimiento,
    u.genero,
    u.estado_civil,
    u.ciudad_id,
    c.nombre AS ciudad_nombre,
    u.localidad_id,
    l.nombre AS localidad_nombre,
    u.barrio_id,
    b.nombre AS barrio_nombre,
    u.zona_id,
    z.nombre AS zona_nombre,
    coord.email AS coordinador_email,
    CONCAT(uc.nombres, ' ', uc.apellidos) AS coordinador_nombre
FROM militantes m
LEFT JOIN usuarios u ON m.usuario_id = u.id
LEFT JOIN tipos_militante tm ON m.tipo_militante_id = tm.id
LEFT JOIN ciudades c ON u.ciudad_id = c.id
LEFT JOIN localidades l ON u.localidad_id = l.id
LEFT JOIN barrios b ON u.barrio_id = b.id
LEFT JOIN zonas z ON u.zona_id = z.id
LEFT JOIN coordinadores coord ON m.coordinador_id = coord.id
LEFT JOIN usuarios uc ON coord.usuario_id = uc.id;

CREATE OR REPLACE VIEW v_coordinadores_completo AS
SELECT
    coord.id AS coordinador_id,
    coord.usuario_id,
    coord.email,
    coord.tipo,
    coord.estado,
    coord.perfil_id,
    p.nombre AS rol,
    coord.referencia_coordinador_id,
    CONCAT(uref.nombres, ' ', uref.apellidos) AS referencia_nombre,
    u.nombres,
    u.apellidos,
    u.numero_documento,
    u.tipo_documento,
    u.celular,
    u.ciudad_id,
    c.nombre AS ciudad_nombre,
    u.zona_id,
    z.nombre AS zona_nombre,
    coord.creado_en,
    coord.actualizado_en
FROM coordinadores coord
LEFT JOIN usuarios u ON coord.usuario_id = u.id
LEFT JOIN perfiles p ON coord.perfil_id = p.id
LEFT JOIN ciudades c ON u.ciudad_id = c.id
LEFT JOIN zonas z ON u.zona_id = z.id
LEFT JOIN coordinadores refc ON coord.referencia_coordinador_id = refc.id
LEFT JOIN usuarios uref ON refc.usuario_id = uref.id;

COMMIT;

-- =====================================================================
-- NOTAS DE CALIDAD DE DATOS DETECTADAS EN EL EXCEL (resolver antes o
-- durante el ETL, no bloquean la creación del esquema):
--
-- 1. 6 filas sin CEDULA (IDs 2, 18, 42, 3, 4, 911: "ECO SOMOS TODOS",
--    "VERIFICADOR 1/2/3", etc.) NO se cargan al ETL — regla de negocio
--    confirmada: un militante sin cédula no se registra. El campo
--    numero_documento quedó NOT NULL + UNIQUE. Cuando el usuario suba un
--    nuevo documento de carga, la app debe advertirle qué filas se
--    omitieron por falta de cédula.
-- 2. Columna TIPO trae 22 filas en "0" y 3 filas con códigos compuestos
--    ("80001-02", "80003-02") que no existen en el catálogo. Normalizar
--    a un tipo válido o dejar tipo_militante_id NULL.
-- 3. GENERO y VIVIENDA tienen variantes de mayúsculas/minúsculas
--    (Hombre/HOMBRE/hombre, Propia/PROPIA) que deben normalizarse en el
--    ETL antes del CHECK constraint.
-- 4. COORDINADOR y DIRIGENTE (columnas de texto libre) SÍ tienen
--    correspondencia 100% con NOMBRE COMPLETO dentro del mismo Excel:
--    se resuelven por nombre para poblar militantes.coordinador_id y
--    dirigentes.id_dirigente/id_coordinador.
-- 5. REFERENCIA (quién recomendó a la persona) solo hace match con un
--    militante existente en 33 de 118 casos; el resto son personas
--    externas — quedan en referido_por_nombre como texto libre.
-- 6. Columna "NO SE DE DONDE SALE ESTE NUMERO" es un teléfono sin
--    identificar su propósito real; se mapea a stg_personas_excel pero
--    NO se traslada a usuarios hasta aclarar con el equipo qué es.
-- 7. IDEOLOGÍA viene 100% vacía en este Excel — el campo existe en el
--    esquema pero no se puede poblar desde esta fuente.
-- =====================================================================
