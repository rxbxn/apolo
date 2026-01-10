-- =====================================================
-- MIGRACIÓN: MÓDULO COORDINADOR
-- Fecha: 2025-11-29
-- Descripción: Crea tabla coordinadores, vista y módulo
-- SAFE TO RUN: No borra nada existente, solo agrega
-- =====================================================

-- 1. CREAR TABLA COORDINADORES (solo si no existe)
CREATE TABLE IF NOT EXISTS public.coordinadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    referencia_coordinador_id UUID REFERENCES public.coordinadores(id) ON DELETE SET NULL,
    perfil_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creado_por UUID REFERENCES public.usuarios(id),
    actualizado_por UUID REFERENCES public.usuarios(id),
    CONSTRAINT coordinadores_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 2. CREAR ÍNDICES (solo si no existen)
CREATE INDEX IF NOT EXISTS idx_coordinadores_usuario ON public.coordinadores(usuario_id);
CREATE INDEX IF NOT EXISTS idx_coordinadores_email ON public.coordinadores(email);
CREATE INDEX IF NOT EXISTS idx_coordinadores_auth_user ON public.coordinadores(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_coordinadores_referencia ON public.coordinadores(referencia_coordinador_id);
CREATE INDEX IF NOT EXISTS idx_coordinadores_perfil ON public.coordinadores(perfil_id);
CREATE INDEX IF NOT EXISTS idx_coordinadores_estado ON public.coordinadores(estado);

-- 3. AGREGAR COMENTARIOS
COMMENT ON TABLE public.coordinadores IS 'Tabla de coordinadores políticos con credenciales de acceso al sistema';
COMMENT ON COLUMN public.coordinadores.usuario_id IS 'Referencia a la persona en la tabla usuarios';
COMMENT ON COLUMN public.coordinadores.auth_user_id IS 'Usuario de autenticación en Supabase Auth';
COMMENT ON COLUMN public.coordinadores.referencia_coordinador_id IS 'Coordinador que refiere a este coordinador';

-- 4. CREAR/ACTUALIZAR TRIGGER
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_actualizar_coordinadores'
    ) THEN
        CREATE TRIGGER trigger_actualizar_coordinadores
            BEFORE UPDATE ON public.coordinadores
            FOR EACH ROW
            EXECUTE FUNCTION public.actualizar_timestamp();
    END IF;
END $$;

-- 5. HABILITAR RLS
ALTER TABLE public.coordinadores ENABLE ROW LEVEL SECURITY;

-- 6. CREAR POLÍTICAS RLS (DROP si existen para recrearlas)
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer coordinadores" ON public.coordinadores;
CREATE POLICY "Usuarios autenticados pueden leer coordinadores"
    ON public.coordinadores FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios con permiso pueden crear coordinadores" ON public.coordinadores;
CREATE POLICY "Usuarios con permiso pueden crear coordinadores"
    ON public.coordinadores FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuarios u
            JOIN public.usuario_perfil up ON u.id = up.usuario_id
            JOIN public.perfil_permiso_modulo ppm ON up.perfil_id = ppm.perfil_id
            JOIN public.modulos m ON ppm.modulo_id = m.id
            JOIN public.permisos p ON ppm.permiso_id = p.id
            WHERE u.auth_user_id = auth.uid()
            AND m.nombre = 'Módulo Coordinador'
            AND p.codigo = 'CREATE'
            AND up.activo = true
        )
    );

DROP POLICY IF EXISTS "Usuarios con permiso pueden actualizar coordinadores" ON public.coordinadores;
CREATE POLICY "Usuarios con permiso pueden actualizar coordinadores"
    ON public.coordinadores FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios u
            JOIN public.usuario_perfil up ON u.id = up.usuario_id
            JOIN public.perfil_permiso_modulo ppm ON up.perfil_id = ppm.perfil_id
            JOIN public.modulos m ON ppm.modulo_id = m.id
            JOIN public.permisos p ON ppm.permiso_id = p.id
            WHERE u.auth_user_id = auth.uid()
            AND m.nombre = 'Módulo Coordinador'
            AND p.codigo = 'UPDATE'
            AND up.activo = true
        )
    );

DROP POLICY IF EXISTS "Usuarios con permiso pueden eliminar coordinadores" ON public.coordinadores;
CREATE POLICY "Usuarios con permiso pueden eliminar coordinadores"
    ON public.coordinadores FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios u
            JOIN public.usuario_perfil up ON u.id = up.usuario_id
            JOIN public.perfil_permiso_modulo ppm ON up.perfil_id = ppm.perfil_id
            JOIN public.modulos m ON ppm.modulo_id = m.id
            JOIN public.permisos p ON ppm.permiso_id = p.id
            WHERE u.auth_user_id = auth.uid()
            AND m.nombre = 'Módulo Coordinador'
            AND p.codigo = 'DELETE'
            AND up.activo = true
        )
    );

-- 7. INSERTAR MÓDULO EN CATÁLOGO (solo si no existe)
INSERT INTO public.modulos (nombre, descripcion, orden, obligatorio, ruta, icono) 
VALUES ('Módulo Coordinador', 'Gestión de coordinadores políticos con credenciales de acceso', 9, false, '/dashboard/coordinador', 'user-check')
ON CONFLICT (nombre) DO NOTHING;

-- 8. CREAR/ACTUALIZAR VISTA (siempre recrea con la versión correcta)
DROP VIEW IF EXISTS public.v_coordinadores_completo;
CREATE VIEW public.v_coordinadores_completo AS
SELECT 
    c.id as coordinador_id,
    c.email,
    c.estado,
    u.id as usuario_id,
    u.nombres,
    u.apellidos,
    u.numero_documento,
    u.tipo_documento,
    u.celular,
    ciudad.nombre as ciudad_nombre,
    zona.nombre as zona_nombre,
    p.nombre as rol,
    p.id as perfil_id,
    ref_coord.id as referencia_id,
    ref_usuario.nombres || ' ' || ref_usuario.apellidos as referencia_nombre,
    c.creado_en,
    c.actualizado_en
FROM public.coordinadores c
LEFT JOIN public.usuarios u ON c.usuario_id = u.id
LEFT JOIN public.perfiles p ON c.perfil_id = p.id
LEFT JOIN public.ciudades ciudad ON u.ciudad_id = ciudad.id
LEFT JOIN public.zonas zona ON u.zona_id = zona.id
LEFT JOIN public.coordinadores ref_coord ON c.referencia_coordinador_id = ref_coord.id
LEFT JOIN public.usuarios ref_usuario ON ref_coord.usuario_id = ref_usuario.id;

COMMENT ON VIEW public.v_coordinadores_completo IS 'Vista de coordinadores con información completa de usuario, perfil y referencia';

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
SELECT 
    'coordinadores' as tabla,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coordinadores') 
    THEN '✓ Creada' ELSE '✗ No existe' END as estado
UNION ALL
SELECT 
    'v_coordinadores_completo' as tabla,
    CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_coordinadores_completo')
    THEN '✓ Creada' ELSE '✗ No existe' END as estado
UNION ALL
SELECT 
    'modulo_coordinador' as tabla,
    CASE WHEN EXISTS (SELECT 1 FROM public.modulos WHERE nombre = 'Módulo Coordinador')
    THEN '✓ Registrado' ELSE '✗ No registrado' END as estado;
