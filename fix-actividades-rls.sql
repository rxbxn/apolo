-- =====================================================
-- FIX: RLS Policies for Activities
-- =====================================================

-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "Usuarios con permiso pueden crear actividades" ON public.actividades;
DROP POLICY IF EXISTS "Usuarios con permiso pueden actualizar actividades" ON public.actividades;
DROP POLICY IF EXISTS "Usuarios con permiso pueden eliminar actividades" ON public.actividades;

-- Crear políticas más permisivas (permitir a cualquier usuario autenticado)
-- Esto es temporal hasta que se configure el sistema de permisos granular para este módulo

CREATE POLICY "Usuarios autenticados pueden crear actividades"
    ON public.actividades FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar actividades"
    ON public.actividades FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar actividades"
    ON public.actividades FOR DELETE
    USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.actividades IS 'Tabla de actividades de campaña (RLS simplificado)';
