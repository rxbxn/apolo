-- =====================================================================
-- APOLO — ESQUEMA v2 (PostgreSQL puro, sin dependencia de Supabase)
--
-- A diferencia de schema_apolo.sql (v1, diseñado solo desde el Excel),
-- este archivo se construyó comparando columna por columna contra la
-- base REAL en producción (VPS 72.61.64.225, contenedor supabase-db,
-- confirmado como la base viva via .env.local -> NEXT_PUBLIC_SUPABASE_URL
-- = https://72-61-64-225.sslip.io/) y contra el código real del repo
-- (lib/actions/*.ts). Es un mapeo 1:1 con correcciones puntuales, no un
-- diseño desde cero.
--
-- TABLAS EXCLUIDAS A PROPÓSITO (confirmadas muertas: sin referencias en
-- ningún archivo del repo ni uso relacional real). Archivar con pg_dump
-- antes de borrarlas de la base vieja, luego DROP:
--   persona, keiner, app_user, user_roles, agenda_visita,
--   visita_solicitud, stickers, jerarquia_usuarios,
--   formato_gestion_compromisos (duplicado viejo de formularios_gestion)
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================================
-- 1. CATÁLOGOS
-- =====================================================================

CREATE TABLE ciudades (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre         VARCHAR(100) NOT NULL UNIQUE,
    codigo         VARCHAR(20),
    activo         BOOLEAN NOT NULL DEFAULT true,
    orden          INTEGER,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE localidades (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre         VARCHAR(100) NOT NULL,
    codigo         VARCHAR(20),
    ciudad_id      UUID REFERENCES ciudades(id) ON DELETE SET NULL,
    activo         BOOLEAN NOT NULL DEFAULT true,
    orden          INTEGER,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (nombre, ciudad_id)
);

CREATE TABLE barrios (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre         VARCHAR(100) NOT NULL,
    codigo         VARCHAR(20),
    localidad_id   UUID REFERENCES localidades(id) ON DELETE SET NULL,
    ciudad_id      UUID REFERENCES ciudades(id) ON DELETE SET NULL,
    activo         BOOLEAN NOT NULL DEFAULT true,
    orden          INTEGER,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (nombre, localidad_id)
);

CREATE TABLE zonas (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre         VARCHAR(100) NOT NULL UNIQUE,
    descripcion    TEXT,
    codigo         VARCHAR(20),
    color          VARCHAR(7),
    activo         BOOLEAN NOT NULL DEFAULT true,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE niveles_escolaridad (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre    VARCHAR(100) NOT NULL UNIQUE,
    orden     INTEGER,
    activo    BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tipos_vivienda (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre    VARCHAR(100) NOT NULL UNIQUE,
    orden     INTEGER,
    activo    BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catálogo real de tipos de militante. NOTA: en producción hoy
-- militantes.tipo es texto libre y el 100% de las 1474 filas activas
-- tiene literalmente el string 'militante' — este catálogo con los
-- códigos 80001-80005 existe pero NO está conectado por FK a militantes.
-- Se conserva para uso futuro (ver notas al final del archivo).
CREATE TABLE tipos_militante (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo      INTEGER NOT NULL UNIQUE,
    descripcion VARCHAR(255) NOT NULL,
    activo      BOOLEAN NOT NULL DEFAULT true,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO tipos_militante (codigo, descripcion) VALUES
    (80001, 'Militante'), (80002, 'Coordinador de Zona'), (80003, 'Dirigente'),
    (80004, 'Coordinador Local'), (80005, 'Coordinador Municipal');

-- Catálogo real (5 filas en producción): tipo de relación con quien
-- refirió a la persona.
CREATE TABLE tipos_referencia (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo      BOOLEAN NOT NULL DEFAULT true,
    orden       INTEGER,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO tipos_referencia (nombre, orden) VALUES
    ('Familiar', 1), ('Amigo', 2), ('Compañero de trabajo', 3), ('Vecino', 4), ('Otro', 5);

-- Catálogo real (6 filas en producción): opciones de militantes.compromiso_proyecto
CREATE TABLE compromiso (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     TEXT NOT NULL UNIQUE,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO compromiso (nombre) VALUES
    ('GESTIÓN LABORAL'), ('GESTIÓN PRIVADA'), ('GESTIÓN INSTITUCIONAL'),
    ('GESTIÓN DE ESTUDIOS'), ('GESTIÓN A FUTURO'), ('N/A');

-- Catálogo real (7 filas). CORREGIDO: en producción usuarios.grupo_etnico
-- es uuid pero grupo_etnico.id es bigint — nunca pudo ser FK real.
-- Aquí queda uuid en ambos lados para que la relación funcione de verdad.
CREATE TABLE grupo_etnico (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre    TEXT NOT NULL UNIQUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Directorio real de personas que refieren militantes (266 filas en
-- producción). CORREGIDO: hoy usuarios NO tiene FK real hacia aquí
-- (usuarios.referencia_id es texto libre sin relación) — se conecta
-- correctamente en la sección 3.
CREATE TABLE referencia (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre     TEXT,
    telefono   TEXT,
    ciudad_id  UUID REFERENCES ciudades(id) ON DELETE SET NULL,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 2. RBAC
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
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    descripcion     TEXT,
    icono           VARCHAR(50),
    ruta            VARCHAR(255),
    orden           INTEGER,
    modulo_padre_id UUID REFERENCES modulos(id) ON DELETE SET NULL,
    activo          BOOLEAN NOT NULL DEFAULT true,
    obligatorio     BOOLEAN NOT NULL DEFAULT false,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permisos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    codigo      VARCHAR(50) NOT NULL UNIQUE,
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
-- 3. USUARIOS
--
-- CAMBIOS vs producción actual:
--  - Se eliminan barrio_nombre/localidad_nombre/ciudad_nombre/zona_nombre
--    (texto duplicado del id; riesgo de quedar desincronizado). La vista
--    v_usuarios_completo al final resuelve los nombres por JOIN.
--  - nivel_escolaridad y tipo_vivienda pasan de texto libre a FK real
--    hacia los catálogos que ya existían pero no se usaban para esto.
--  - grupo_etnico pasa a FK real (antes uuid sin relación funcional).
--  - Se reemplazan referencia_id (texto suelto) y referido_por (texto
--    suelto, duplicado del anterior) por referencia_persona_id, FK real
--    a la tabla `referencia` (266 personas ya catalogadas).
--  - Se quita el valor 'Género' del CHECK de genero (bug de datos: era
--    un valor placeholder, no una opción real). Verificar antes de
--    migrar si hay filas con genero='Género' (ver notas finales).
--  - auth_user_id -> auth.users se reemplaza por la tabla `credenciales`
--    (sección 4), ya que dejamos de depender de Supabase Auth.
-- =====================================================================

CREATE TABLE usuarios (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tipo_documento            VARCHAR(20) NOT NULL DEFAULT 'Cédula',
    numero_documento          VARCHAR(30) NOT NULL UNIQUE,
    nombres                   VARCHAR(100) NOT NULL,
    apellidos                 VARCHAR(100) NOT NULL,

    email                     VARCHAR(255) NOT NULL,
    foto_perfil_url           TEXT,
    celular                   VARCHAR(20),
    whatsapp                  VARCHAR(20),
    telefono                  VARCHAR(20),
    telefono_fijo             VARCHAR(20),
    direccion                 TEXT,

    barrio_id                 UUID REFERENCES barrios(id) ON DELETE SET NULL,
    localidad_id              UUID REFERENCES localidades(id) ON DELETE SET NULL,
    ciudad_id                 UUID REFERENCES ciudades(id) ON DELETE SET NULL,
    zona_id                   UUID REFERENCES zonas(id) ON DELETE SET NULL,
    ubicacion                 VARCHAR(200),
    latitud                   NUMERIC(10,8),
    longitud                  NUMERIC(11,8),

    fecha_nacimiento          DATE,
    lugar_nacimiento          VARCHAR(100),
    genero                    VARCHAR(20) CHECK (genero IN ('Masculino', 'Femenino', 'Otro')),
    estado_civil              VARCHAR(30),
    numero_hijos              INTEGER NOT NULL DEFAULT 0,
    tiene_hijos               BOOLEAN NOT NULL DEFAULT false,
    nivel_escolaridad_id      UUID REFERENCES niveles_escolaridad(id) ON DELETE SET NULL,
    perfil_ocupacion          VARCHAR(100),
    tipo_vivienda_id          UUID REFERENCES tipos_vivienda(id) ON DELETE SET NULL,
    talla_camisa              VARCHAR(10),
    estrato                   VARCHAR(20),
    ingresos_rango            VARCHAR(50),
    ideologia_politica        TEXT CHECK (ideologia_politica IN ('Izquierda', 'Centro', 'Derecha')),
    grupo_etnico_id           UUID REFERENCES grupo_etnico(id) ON DELETE SET NULL,

    facebook                  VARCHAR(255),
    twitter                   VARCHAR(255),
    instagram                 VARCHAR(255),
    linkedin                  VARCHAR(255),
    tiktok                    VARCHAR(255),

    -- Referenciación (quién trajo a esta persona)
    referencia_persona_id     UUID REFERENCES referencia(id) ON DELETE SET NULL,
    tipo_referencia_id        UUID REFERENCES tipos_referencia(id) ON DELETE SET NULL,
    telefono_referencia       VARCHAR(20),

    nombre_familiar_cercano   VARCHAR(200),
    celular_familiar_cercano  VARCHAR(20),
    lider_responsable         VARCHAR(255),

    cargo_actual              VARCHAR(100),
    beneficiario              VARCHAR(100),
    compromiso_privado        VARCHAR(100),
    observaciones             TEXT,

    -- Puntajes de compromiso (enteros, como está hoy en producción)
    compromiso_marketing      INTEGER NOT NULL DEFAULT 0,
    compromiso_impacto        INTEGER NOT NULL DEFAULT 0,
    compromiso_cautivo        INTEGER NOT NULL DEFAULT 0,

    -- Verificación de sticker/material
    verificacion_sticker              VARCHAR(255),
    fecha_verificacion_sticker        TIMESTAMPTZ,
    observacion_verificacion_sticker  TEXT,
    nombre_verificador                VARCHAR(255),

    fecha_registro             DATE,   -- mapeo del Excel: FECHA

    ultimo_acceso               TIMESTAMPTZ,
    estado                       VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    creado_en                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por                     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por                 UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_usuarios_documento ON usuarios (numero_documento);
CREATE INDEX idx_usuarios_email ON usuarios (email);
CREATE INDEX idx_usuarios_nombres_apellidos ON usuarios (nombres, apellidos);
CREATE INDEX idx_usuarios_nombre_trgm ON usuarios USING gin ((nombres || ' ' || apellidos) gin_trgm_ops);
CREATE INDEX idx_usuarios_barrio ON usuarios (barrio_id);
CREATE INDEX idx_usuarios_ciudad ON usuarios (ciudad_id);
CREATE INDEX idx_usuarios_localidad ON usuarios (localidad_id);
CREATE INDEX idx_usuarios_zona ON usuarios (zona_id);
CREATE INDEX idx_usuarios_estado ON usuarios (estado);
CREATE INDEX idx_usuarios_referencia_persona ON usuarios (referencia_persona_id);

-- =====================================================================
-- 4. CREDENCIALES — reemplaza auth.users de Supabase Auth Y la columna
--    coordinadores.password que existía en paralelo (2 sistemas de auth
--    corriendo a la vez en producción). Rotar cualquier password real
--    que hoy viva en coordinadores.password antes de dar de baja esa
--    columna — ver notas de seguridad al final.
-- =====================================================================

CREATE TABLE credenciales (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id             UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    email                  VARCHAR(255) NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    password_hash          TEXT NOT NULL,
    rol                    VARCHAR(30) NOT NULL DEFAULT 'coordinador' CHECK (rol IN ('admin', 'dirigente', 'coordinador')),
    activo                 BOOLEAN NOT NULL DEFAULT true,
    debe_cambiar_password  BOOLEAN NOT NULL DEFAULT true,
    ultimo_acceso          TIMESTAMPTZ,
    creado_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credenciales_email ON credenciales (email);

-- =====================================================================
-- 5. COORDINADORES — tipo real en producción: 'Coordinador' | 'Estructurador'
--    (no zona/local/municipal como se asumió en v1).
-- =====================================================================

CREATE TABLE coordinadores (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id                 UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    credencial_id              UUID UNIQUE REFERENCES credenciales(id) ON DELETE SET NULL,
    email                      VARCHAR(255) NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    tipo                       VARCHAR(50) CHECK (tipo IN ('Coordinador', 'Estructurador')),
    referencia_coordinador_id  UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
    perfil_id                  UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    estado                     VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    creado_en                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por                  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por               UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_coordinadores_usuario ON coordinadores (usuario_id);
CREATE INDEX idx_coordinadores_referencia ON coordinadores (referencia_coordinador_id);
CREATE INDEX idx_coordinadores_estado ON coordinadores (estado);
CREATE INDEX idx_coordinadores_perfil ON coordinadores (perfil_id);

-- =====================================================================
-- 6. DIRIGENTES — CORREGIDO: en producción id_dirigente/id_coordinador
--    son TEXT sin foreign key (cero integridad referencial). Los datos
--    reales sí contienen UUIDs válidos de coordinadores.id (verificado
--    con muestra), así que el cast a UUID+FK es seguro.
-- =====================================================================

CREATE TABLE dirigentes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_dirigente   UUID NOT NULL REFERENCES coordinadores(id) ON DELETE CASCADE,
    id_coordinador UUID NOT NULL REFERENCES coordinadores(id) ON DELETE CASCADE,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (id_dirigente <> id_coordinador),
    UNIQUE (id_dirigente, id_coordinador)
);

CREATE INDEX idx_dirigentes_coordinador ON dirigentes (id_coordinador);
CREATE INDEX idx_dirigentes_dirigente ON dirigentes (id_dirigente);

-- =====================================================================
-- 7. MILITANTES
--
-- CAMBIO IMPORTANTE: hoy compromiso_marketing/cautivo/impacto son
-- VARCHAR(255) aquí pero INTEGER en usuarios — mismo concepto, dos tipos
-- distintos. Se deja documentado como pregunta abierta (ver notas
-- finales) en vez de asumir cuál es la fuente de verdad; aquí se
-- mantiene VARCHAR para no perder datos existentes tal como están.
-- =====================================================================

CREATE TABLE militantes (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id             UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo                   VARCHAR(50) NOT NULL DEFAULT 'militante',
    coordinador_id         UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
    dirigente_id           UUID REFERENCES coordinadores(id) ON DELETE SET NULL,

    compromiso_difusion    VARCHAR(255),
    compromiso_marketing   VARCHAR(255),
    compromiso_cautivo     VARCHAR(255),
    compromiso_impacto     VARCHAR(255),
    compromiso_proyecto_id UUID REFERENCES compromiso(id) ON DELETE SET NULL,

    formulario             VARCHAR(255),
    estado                  VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    creado_en                TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por                  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por                UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_militantes_coordinador ON militantes (coordinador_id);
CREATE INDEX idx_militantes_dirigente ON militantes (dirigente_id);
CREATE INDEX idx_militantes_estado ON militantes (estado);

-- =====================================================================
-- 8. USUARIO_PERFIL (asignación de perfiles RBAC)
-- =====================================================================

CREATE TABLE usuario_perfil (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id        UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    perfil_id         UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    es_principal      BOOLEAN NOT NULL DEFAULT false,
    fecha_asignacion  TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_revocacion  TIMESTAMPTZ,
    activo            BOOLEAN NOT NULL DEFAULT true,
    asignado_por      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE (usuario_id, perfil_id)
);

-- =====================================================================
-- 9. ACTIVIDADES
-- =====================================================================

CREATE TABLE actividades (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(255) NOT NULL,
    estado          VARCHAR(20) NOT NULL CHECK (estado IN ('vigente', 'no_vigente')),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

-- =====================================================================
-- 10. AGENDA — CORREGIDO: usuario_id apuntaba a auth.users(id); pasa a
--     usuarios(id) al dejar de depender de Supabase Auth.
-- =====================================================================

CREATE TABLE agenda_eventos (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo         VARCHAR(255) NOT NULL,
    fecha_inicio   DATE NOT NULL,
    hora_inicio    TIME NOT NULL,
    fecha_fin      DATE,
    hora_fin       TIME,
    color          VARCHAR(20) NOT NULL DEFAULT 'blanco' CHECK (color IN ('blanco', 'negro', 'gris', 'grisClaro')),
    descripcion    TEXT,
    usuario_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    activo         BOOLEAN NOT NULL DEFAULT true,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 11. MÓDULO DEBATE (día de elecciones / seguimiento operativo)
--     Todas confirmadas en uso real vía lib/actions/debate.ts
-- =====================================================================

CREATE TABLE debate_planillas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coordinador_id  UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
    militante_id    UUID REFERENCES militantes(id) ON DELETE SET NULL,
    radicado        INTEGER,
    cautivo         INTEGER,
    marketing       INTEGER,
    impacto         INTEGER,
    fecha_planilla  DATE NOT NULL,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE debate_inconsistencias (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coordinador_id        UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
    militante_id          UUID REFERENCES militantes(id) ON DELETE SET NULL,
    radical               INTEGER,
    exclusion             INTEGER,
    fuera_barranquilla    INTEGER,
    fecha_inconsistencia  DATE NOT NULL,
    fecha_resolucion      DATE,
    cantidad_resuelto     INTEGER,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por            UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por       UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE debate_casa_estrategica (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coordinador_id        UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
    militante_id          UUID REFERENCES militantes(id) ON DELETE SET NULL,
    direccion             TEXT NOT NULL,
    ciudad_id             UUID REFERENCES ciudades(id) ON DELETE SET NULL,
    barrio_id             UUID REFERENCES barrios(id) ON DELETE SET NULL,
    medidas               VARCHAR(100),
    tipo_publicidad       VARCHAR(100),
    fecha_instalacion     DATE NOT NULL,
    fecha_desinstalacion  DATE,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por            UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por       UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE debate_vehiculo_amigo (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coordinador_id  UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
    propietario     VARCHAR(200) NOT NULL,
    placa           VARCHAR(20) NOT NULL,
    tipo_vehiculo   VARCHAR(50),
    fecha_registro  DATE NOT NULL DEFAULT CURRENT_DATE,
    observaciones   TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE debate_publicidad_vehiculo (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coordinador_id        UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
    tipo_publicidad       VARCHAR(100),
    medidas               VARCHAR(100),
    ciudad_id             UUID REFERENCES ciudades(id) ON DELETE SET NULL,
    barrio_id             UUID REFERENCES barrios(id) ON DELETE SET NULL,
    fecha_instalacion     DATE NOT NULL,
    fecha_desinstalacion  DATE,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por            UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por       UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_debate_planillas_coordinador ON debate_planillas (coordinador_id);
CREATE INDEX idx_debate_planillas_militante ON debate_planillas (militante_id);
CREATE INDEX idx_debate_inconsistencias_coordinador ON debate_inconsistencias (coordinador_id);
CREATE INDEX idx_debate_casa_estrategica_coordinador ON debate_casa_estrategica (coordinador_id);

-- =====================================================================
-- 12. GESTIÓN GERENCIAL
--
-- CORREGIDO: formularios_gestion.militante_id/dirigente_id/coordinador_id
-- eran VARCHAR(50) sin FK en producción — pasan a UUID con FK real.
-- catalogo_gestion: se usan las columnas que el código realmente lee/
-- escribe (elemento/unidad/categoria/sector); se descartan
-- tipo/nombre/descripcion que quedaron de un diseño anterior sin uso.
-- Se elimina formato_gestion_compromisos (duplicado viejo sin
-- referencias en el código) y su FK en solicitudes_gestion.
-- =====================================================================

CREATE TABLE elementos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(255) NOT NULL,
    descripcion TEXT,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE catalogo_gestion (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elemento    VARCHAR(255),
    unidad      VARCHAR(255),
    categoria   VARCHAR(255),
    sector      VARCHAR(255),
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE formularios_gestion (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_formulario        VARCHAR(50) NOT NULL UNIQUE,
    fecha_necesidad          DATE,
    prioridad                VARCHAR(50) CHECK (prioridad IN ('alta', 'media', 'baja')),

    militante_id             UUID REFERENCES militantes(id) ON DELETE SET NULL,
    dirigente_id             UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
    coordinador_id           UUID REFERENCES coordinadores(id) ON DELETE SET NULL,
    telefono                 VARCHAR(50),
    localidad                VARCHAR(255),
    receptor                 VARCHAR(255),

    estado_difusion          VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    limpio_conteo            INTEGER NOT NULL DEFAULT 0,
    limpio_pendiente         INTEGER NOT NULL DEFAULT 0,
    codigo_lider             VARCHAR(100),

    tipo_gestion              VARCHAR(100),
    gestor_asignado           VARCHAR(100),
    detalle_solicitud          TEXT,

    autorizacion_total         NUMERIC(15,2) NOT NULL DEFAULT 0,
    fecha_entrega                DATE,
    observaciones_prioridad       TEXT,
    observaciones_generales        TEXT,

    estado                          VARCHAR(50) NOT NULL DEFAULT 'borrador'
                                     CHECK (estado IN ('borrador', 'enviado', 'en_proceso', 'aprobado', 'rechazado', 'completado')),

    creado_en                        TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por                         UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por                      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    aprobado_por                          UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE solicitudes_gestion (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    formulario_id  UUID NOT NULL REFERENCES formularios_gestion(id) ON DELETE CASCADE,
    elemento       VARCHAR(255),
    unidad         VARCHAR(100),
    categoria      VARCHAR(100),
    sector         VARCHAR(100),
    cantidad       NUMERIC(10,2),
    orden          INTEGER NOT NULL DEFAULT 1,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_formularios_gestion_militante ON formularios_gestion (militante_id);
CREATE INDEX idx_formularios_gestion_coordinador ON formularios_gestion (coordinador_id);
CREATE INDEX idx_solicitudes_gestion_formulario ON solicitudes_gestion (formulario_id, orden);

-- =====================================================================
-- 13. STAGING para el ETL desde el Excel / la base vieja
-- =====================================================================

CREATE TABLE stg_personas_excel (
    fila_excel                        INTEGER PRIMARY KEY,
    cedula TEXT, estado TEXT, fecha TEXT, nombre_completo TEXT,
    coordinador TEXT, dirigente TEXT, tipo TEXT, talla TEXT,
    lugar_nacimiento TEXT, direccion TEXT, telefono_fijo TEXT, ciudad TEXT,
    barrio TEXT, localidad TEXT, nacimiento TEXT, genero TEXT, email TEXT,
    referencia TEXT, tel_referencia TEXT, vivienda TEXT, facebook TEXT,
    instagram TEXT, twitter TEXT, whatsapp TEXT, estudios TEXT,
    ocupacion TEXT, comp_difusion TEXT, comp_marketing TEXT,
    comp_impacto TEXT, comp_cautivo TEXT, comp_proyecto TEXT,
    verificacion_sticker TEXT, fecha_verificacion_sticker TEXT,
    observacion_verificacion_sticker TEXT, nombre_verificador TEXT,
    beneficiario TEXT, poblacion TEXT, ubicacion TEXT, hijos TEXT,
    ideologia TEXT, telefono_sin_verificar TEXT,
    procesado BOOLEAN NOT NULL DEFAULT false,
    usuario_id_generado UUID REFERENCES usuarios(id),
    error_procesamiento TEXT
);

-- =====================================================================
-- 14. TRIGGERS actualizado_en
-- =====================================================================

CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'ciudades','localidades','barrios','zonas','perfiles','modulos',
        'usuarios','credenciales','coordinadores','militantes',
        'actividades','agenda_eventos','debate_planillas',
        'debate_inconsistencias','debate_casa_estrategica',
        'debate_vehiculo_amigo','debate_publicidad_vehiculo',
        'elementos','catalogo_gestion','formularios_gestion',
        'solicitudes_gestion'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%I_actualizado_en BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();', t, t
        );
    END LOOP;
END $$;

-- =====================================================================
-- 15. VISTAS
-- =====================================================================

CREATE OR REPLACE VIEW v_usuarios_completo AS
SELECT u.*,
       b.nombre AS barrio_nombre, l.nombre AS localidad_nombre,
       c.nombre AS ciudad_nombre, z.nombre AS zona_nombre,
       ne.nombre AS nivel_escolaridad_nombre, tv.nombre AS tipo_vivienda_nombre,
       ge.nombre AS grupo_etnico_nombre, tr.nombre AS tipo_referencia_nombre,
       r.nombre AS referencia_nombre, r.telefono AS referencia_telefono
FROM usuarios u
LEFT JOIN barrios b ON u.barrio_id = b.id
LEFT JOIN localidades l ON u.localidad_id = l.id
LEFT JOIN ciudades c ON u.ciudad_id = c.id
LEFT JOIN zonas z ON u.zona_id = z.id
LEFT JOIN niveles_escolaridad ne ON u.nivel_escolaridad_id = ne.id
LEFT JOIN tipos_vivienda tv ON u.tipo_vivienda_id = tv.id
LEFT JOIN grupo_etnico ge ON u.grupo_etnico_id = ge.id
LEFT JOIN tipos_referencia tr ON u.tipo_referencia_id = tr.id
LEFT JOIN referencia r ON u.referencia_persona_id = r.id;

CREATE OR REPLACE VIEW v_militantes_completo AS
SELECT m.*, u.nombres, u.apellidos, u.numero_documento, u.email, u.celular,
       u.whatsapp, u.ciudad_id, cd.nombre AS ciudad_nombre,
       coord.email AS coordinador_email,
       CONCAT(uc.nombres, ' ', uc.apellidos) AS coordinador_nombre,
       CONCAT(ud.nombres, ' ', ud.apellidos) AS dirigente_nombre
FROM militantes m
LEFT JOIN usuarios u ON m.usuario_id = u.id
LEFT JOIN ciudades cd ON u.ciudad_id = cd.id
LEFT JOIN coordinadores coord ON m.coordinador_id = coord.id
LEFT JOIN usuarios uc ON coord.usuario_id = uc.id
LEFT JOIN coordinadores dcoord ON m.dirigente_id = dcoord.id
LEFT JOIN usuarios ud ON dcoord.usuario_id = ud.id;

CREATE OR REPLACE VIEW v_coordinadores_completo AS
SELECT coord.*, u.nombres, u.apellidos, u.numero_documento, u.tipo_documento,
       u.celular, u.ciudad_id, c.nombre AS ciudad_nombre, u.zona_id, z.nombre AS zona_nombre,
       p.nombre AS rol,
       CONCAT(uref.nombres, ' ', uref.apellidos) AS referencia_nombre
FROM coordinadores coord
LEFT JOIN usuarios u ON coord.usuario_id = u.id
LEFT JOIN perfiles p ON coord.perfil_id = p.id
LEFT JOIN ciudades c ON u.ciudad_id = c.id
LEFT JOIN zonas z ON u.zona_id = z.id
LEFT JOIN coordinadores refc ON coord.referencia_coordinador_id = refc.id
LEFT JOIN usuarios uref ON refc.usuario_id = uref.id;

COMMIT;

-- =====================================================================
-- NOTAS Y PREGUNTAS ABIERTAS PARA EL EQUIPO ANTES DE MIGRAR DATOS
-- =====================================================================
--
-- SEGURIDAD (revisar antes que nada):
--   1. coordinadores.password (texto) en producción existe en paralelo a
--      Supabase Auth (auth_user_id). Verificar si contiene hashes o
--      contraseñas en texto plano: si es texto plano, es una fuga de
--      seguridad activa — rotar credenciales de esos coordinadores ya.
--
-- LIMPIEZA CONFIRMADA (archivar con pg_dump y luego DROP en la base
-- vieja; no se migran a v2 porque no tienen referencias en el código):
--   persona, keiner, app_user, user_roles, agenda_visita,
--   visita_solicitud, stickers, jerarquia_usuarios,
--   formato_gestion_compromisos
--
-- DECISIONES DE NEGOCIO PENDIENTES (no las resolví por mi cuenta,
-- necesitan que el equipo confirme la semántica real):
--   1. compromiso_marketing/cautivo/impacto existen en DOS lugares con
--      tipos distintos: INTEGER en usuarios, VARCHAR(255) en militantes.
--      ¿Cuál es la fuente de verdad? Propuesta: consolidar en militantes
--      (con FK a coordinador ya presente) y eliminar de usuarios, pero
--      hay que confirmar que ningún reporte actual lea desde usuarios.
--   2. militantes.tipo hoy es siempre el string 'militante' en las 1474
--      filas activas — el catálogo tipos_militante (con códigos
--      80001-80005 heredados del Excel) no está conectado. ¿Se quiere
--      activar esa clasificación (zona/local/municipal/dirigente) a
--      nivel de militante, o esa info vive solo en coordinadores.tipo
--      ('Coordinador'/'Estructurador')? Son dos taxonomías distintas
--      hoy sin relación entre sí.
--   3. usuarios.genero tiene 'Género' como valor válido en el CHECK
--      actual de producción — probablemente un bug (placeholder que
--      quedó). Antes de aplicar el CHECK nuevo (sin 'Género'), correr:
--      SELECT count(*) FROM usuarios WHERE genero = 'Género';
--      Si hay filas, decidir a qué valor real corresponden.
--
-- Este archivo NO ejecuta ninguna migración de datos — es solo el DDL
-- del esquema destino. El script de migración de datos (desde
-- supabase-db actual hacia esta estructura) es el siguiente paso, una
-- vez confirmadas las 3 decisiones de arriba.
-- =====================================================================
