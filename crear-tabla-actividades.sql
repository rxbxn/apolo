-- =====================================================
-- TABLA: actividades
-- =====================================================

CREATE TABLE IF NOT EXISTS public.actividades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('vigente', 'no_vigente')),
    
    -- Auditoría
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creado_por UUID REFERENCES public.usuarios(id),
    actualizado_por UUID REFERENCES public.usuarios(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_actividades_nombre ON public.actividades(nombre);
CREATE INDEX IF NOT EXISTS idx_actividades_estado ON public.actividades(estado);

COMMENT ON TABLE public.actividades IS 'Tabla de actividades de campaña';

-- Trigger para actualizar timestamp
CREATE TRIGGER trigger_actualizar_actividades
    BEFORE UPDATE ON public.actividades
    FOR EACH ROW
    EXECUTE FUNCTION public.actualizar_timestamp();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura (Todos los usuarios autenticados pueden ver)
CREATE POLICY "Usuarios autenticados pueden ver actividades"
    ON public.actividades FOR SELECT
    USING (auth.role() = 'authenticated');

-- Políticas de escritura (Solo usuarios con permiso pueden crear/editar)
-- Asumiendo que existe un módulo 'Módulo Actividades' y permisos CREATE/UPDATE
-- Si no existe el módulo, se puede ajustar o usar una política más permisiva por ahora.

CREATE POLICY "Usuarios con permiso pueden crear actividades"
    ON public.actividades FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuarios u
            JOIN public.usuario_perfil up ON u.id = up.usuario_id
            JOIN public.perfil_permiso_modulo ppm ON up.perfil_id = ppm.perfil_id
            JOIN public.modulos m ON ppm.modulo_id = m.id
            JOIN public.permisos p ON ppm.permiso_id = p.id
            WHERE u.auth_user_id = auth.uid()
            AND m.nombre = 'Módulo Actividades' -- Ajustar nombre si es necesario
            AND p.codigo = 'CREATE'
            AND up.activo = true
        )
        OR auth.role() = 'service_role' -- Permitir al rol de servicio
    );

CREATE POLICY "Usuarios con permiso pueden actualizar actividades"
    ON public.actividades FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios u
            JOIN public.usuario_perfil up ON u.id = up.usuario_id
            JOIN public.perfil_permiso_modulo ppm ON up.perfil_id = ppm.perfil_id
            JOIN public.modulos m ON ppm.modulo_id = m.id
            JOIN public.permisos p ON ppm.permiso_id = p.id
            WHERE u.auth_user_id = auth.uid()
            AND m.nombre = 'Módulo Actividades'
            AND p.codigo = 'UPDATE'
            AND up.activo = true
        )
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Usuarios con permiso pueden eliminar actividades"
    ON public.actividades FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios u
            JOIN public.usuario_perfil up ON u.id = up.usuario_id
            JOIN public.perfil_permiso_modulo ppm ON up.perfil_id = ppm.perfil_id
            JOIN public.modulos m ON ppm.modulo_id = m.id
            JOIN public.permisos p ON ppm.permiso_id = p.id
            WHERE u.auth_user_id = auth.uid()
            AND m.nombre = 'Módulo Actividades'
            AND p.codigo = 'DELETE'
            AND up.activo = true
        )
        OR auth.role() = 'service_role'
    );

-- Insertar el módulo de actividades si no existe (Opcional, para asegurar que las políticas funcionen)
INSERT INTO public.modulos (nombre, descripcion, icono, ruta, orden, activo)
VALUES ('Módulo Actividades', 'Gestión de actividades de campaña', 'activity', '/dashboard/activities', 10, true)
ON CONFLICT (nombre) DO NOTHING;

-- Asignar permisos básicos al módulo (Opcional)
-- Esto requeriría saber los IDs de los perfiles, así que lo omito por seguridad para no romper nada.
