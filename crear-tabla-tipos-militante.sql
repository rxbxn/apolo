-- SQL para crear la tabla tipos_militante

CREATE TABLE IF NOT EXISTS public.tipos_militante (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo INT NOT NULL UNIQUE,
    descripcion VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.tipos_militante IS 'Catálogo de tipos de militante.';
COMMENT ON COLUMN public.tipos_militante.codigo IS 'Código numérico único para el tipo de militante.';
COMMENT ON COLUMN public.tipos_militante.descripcion IS 'Descripción del tipo de militante.';

-- Habilitar RLS
ALTER TABLE public.tipos_militante ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Usuarios autenticados pueden leer tipos_militante"
    ON public.tipos_militante FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios con permiso pueden crear tipos_militante"
    ON public.tipos_militante FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuarios u
            JOIN public.usuario_perfil up ON u.id = up.usuario_id
            JOIN public.perfil_permiso_modulo ppm ON up.perfil_id = ppm.perfil_id
            JOIN public.modulos m ON ppm.modulo_id = m.id
            JOIN public.permisos p ON ppm.permiso_id = p.id
            WHERE u.auth_user_id = auth.uid()
            AND m.nombre = 'Configuración' -- Asumiendo que el nuevo módulo se llamará así
            AND p.codigo = 'CREATE'
            AND up.activo = true
        )
    );

CREATE POLICY "Usuarios con permiso pueden actualizar tipos_militante"
    ON public.tipos_militante FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios u
            JOIN public.usuario_perfil up ON u.id = up.usuario_id
            JOIN public.perfil_permiso_modulo ppm ON up.perfil_id = ppm.perfil_id
            JOIN public.modulos m ON ppm.modulo_id = m.id
            JOIN public.permisos p ON ppm.permiso_id = p.id
            WHERE u.auth_user_id = auth.uid()
            AND m.nombre = 'Configuración'
            AND p.codigo = 'UPDATE'
            AND up.activo = true
        )
    );

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla tipos_militante creada y con políticas RLS aplicadas.';
END $$;
