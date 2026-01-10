-- =====================================================
-- SOLUCIÓN TEMPORAL: DESHABILITAR RESTRICCIONES RLS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Eliminar TODAS las políticas anteriores de usuario_perfil
DROP POLICY IF EXISTS "usuario_perfil_select" ON public.usuario_perfil;
DROP POLICY IF EXISTS "usuario_perfil_modificar" ON public.usuario_perfil;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer asignaciones" ON public.usuario_perfil;
DROP POLICY IF EXISTS "Super Admin puede administrar usuario_perfil" ON public.usuario_perfil;
DROP POLICY IF EXISTS "Usuarios autorizados pueden asignar perfiles" ON public.usuario_perfil;
DROP POLICY IF EXISTS "Usuarios autorizados pueden actualizar asignaciones" ON public.usuario_perfil;

-- Política SIMPLE: Permitir TODO a usuarios autenticados
-- Esto elimina por completo el problema de recursión
CREATE POLICY "usuario_perfil_allow_all_authenticated"
    ON public.usuario_perfil FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Verificar
SELECT 'Políticas actuales en usuario_perfil:' as info;
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'usuario_perfil';
