-- =====================================================
-- CORREGIR POLÍTICAS RLS - Ejecutar en Supabase SQL Editor
-- =====================================================

-- PASO 1: Eliminar TODAS las políticas existentes de la tabla usuarios
DROP POLICY IF EXISTS "Usuarios pueden ver su propia información" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden ver todos los usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden crear usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden actualizar usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_authenticated" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_authenticated" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_authenticated" ON public.usuarios;

-- PASO 2: Crear políticas RLS SIMPLES sin recursión

-- Política 1: Permitir SELECT a todos los usuarios autenticados
CREATE POLICY "usuarios_select_all" ON public.usuarios
    FOR SELECT
    TO authenticated
    USING (true);

-- Política 2: Permitir INSERT a todos los usuarios autenticados
CREATE POLICY "usuarios_insert_all" ON public.usuarios
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política 3: Permitir UPDATE a todos los usuarios autenticados
CREATE POLICY "usuarios_update_all" ON public.usuarios
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política 4: Permitir DELETE a todos los usuarios autenticados
CREATE POLICY "usuarios_delete_all" ON public.usuarios
    FOR DELETE
    TO authenticated
    USING (true);

-- PASO 3: Asegurar que RLS esté habilitado
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- PASO 4: Verificar las políticas creadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'usuarios';

-- =====================================================
-- NOTA IMPORTANTE
-- =====================================================
-- Estas políticas son PERMISIVAS para usuarios autenticados.
-- La lógica de permisos granular se maneja en el código de la aplicación.
-- Esto evita la recursión infinita que ocurría al intentar verificar
-- permisos consultando la misma tabla usuarios.
-- =====================================================
