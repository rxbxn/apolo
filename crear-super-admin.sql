-- =====================================================
-- SOLUCIÓN: Deshabilitar RLS temporalmente para crear Super Admin
-- =====================================================

-- PASO 1: Deshabilitar RLS en la tabla usuarios temporalmente
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

-- PASO 2: Insertar el usuario Super Admin
INSERT INTO public.usuarios (
    id,
    auth_user_id,
    tipo_documento,
    numero_documento,
    nombres,
    apellidos,
    email,
    celular,
    whatsapp,
    direccion,
    ciudad_id,
    ciudad_nombre,
    fecha_nacimiento,
    genero,
    estado_civil,
    estado,
    creado_en,
    actualizado_en
) VALUES (
    gen_random_uuid(),
    '3c844b5b-208a-4954-baf0-f870a8124870',
    'Cédula',
    '1234567890',
    'Administrador',
    'Sistema',
    'fabrizioemiliani@gmail.com',
    '3001234567',
    '3001234567',
    'Dirección Principal',
    (SELECT id FROM public.ciudades WHERE nombre = 'Barraquilla' LIMIT 1),
    'Barranquilla',
    '1990-01-01',
    'Masculino',
    'Soltero',
    'activo',
    NOW(),
    NOW()
)
ON CONFLICT (numero_documento) DO UPDATE
SET auth_user_id = EXCLUDED.auth_user_id,
    email = EXCLUDED.email;

-- PASO 3: Crear perfil Super Admin si no existe
INSERT INTO public.perfiles (nombre, descripcion, nivel_jerarquico, activo)
VALUES ('Super Admin', 'Administrador con acceso total al sistema', 0, true)
ON CONFLICT (nombre) DO NOTHING;

-- PASO 4: Asignar TODOS los permisos al Super Admin
INSERT INTO public.perfil_permiso_modulo (perfil_id, modulo_id, permiso_id)
SELECT 
    (SELECT id FROM public.perfiles WHERE nombre = 'Super Admin'),
    m.id,
    p.id
FROM public.modulos m
CROSS JOIN public.permisos p
ON CONFLICT (perfil_id, modulo_id, permiso_id) DO NOTHING;

-- PASO 5: Asignar perfil Super Admin al usuario
INSERT INTO public.usuario_perfil (
    usuario_id,
    perfil_id,
    es_principal,
    fecha_asignacion,
    activo
) VALUES (
    (SELECT id FROM public.usuarios WHERE auth_user_id = '3c844b5b-208a-4954-baf0-f870a8124870'),
    (SELECT id FROM public.perfiles WHERE nombre = 'Super Admin'),
    true,
    NOW(),
    true
)
ON CONFLICT (usuario_id, perfil_id) DO UPDATE
SET es_principal = true, activo = true;

-- PASO 6: Verificar que el usuario fue creado
SELECT 
    u.id,
    u.nombres,
    u.apellidos,
    u.email,
    u.auth_user_id,
    u.estado,
    STRING_AGG(p.nombre, ', ') as perfiles
FROM public.usuarios u
LEFT JOIN public.usuario_perfil up ON u.id = up.usuario_id
LEFT JOIN public.perfiles p ON up.perfil_id = p.id
WHERE u.auth_user_id = '3c844b5b-208a-4954-baf0-f870a8124870'
GROUP BY u.id, u.nombres, u.apellidos, u.email, u.auth_user_id, u.estado;

-- PASO 7: Eliminar las políticas problemáticas
DROP POLICY IF EXISTS "Usuarios pueden ver su propia información" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden ver todos los usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden crear usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios con permiso pueden actualizar usuarios" ON public.usuarios;

-- PASO 8: Crear políticas RLS simplificadas (sin recursión)
-- Política 1: Los usuarios pueden ver su propia información
CREATE POLICY "usuarios_select_own" ON public.usuarios
    FOR SELECT
    USING (auth.uid() = auth_user_id);

-- Política 2: Permitir SELECT a usuarios autenticados (simplificada)
CREATE POLICY "usuarios_select_authenticated" ON public.usuarios
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Política 3: Permitir INSERT a usuarios autenticados
CREATE POLICY "usuarios_insert_authenticated" ON public.usuarios
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Política 4: Los usuarios pueden actualizar su propia información
CREATE POLICY "usuarios_update_own" ON public.usuarios
    FOR UPDATE
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

-- Política 5: Permitir UPDATE a usuarios autenticados (para admins)
CREATE POLICY "usuarios_update_authenticated" ON public.usuarios
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- PASO 9: Re-habilitar RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Ver el usuario creado con sus permisos
SELECT 
    u.nombres || ' ' || u.apellidos as nombre_completo,
    u.email,
    u.estado,
    COUNT(DISTINCT ppm.permiso_id) as total_permisos,
    COUNT(DISTINCT ppm.modulo_id) as total_modulos
FROM public.usuarios u
LEFT JOIN public.usuario_perfil up ON u.id = up.usuario_id
LEFT JOIN public.perfil_permiso_modulo ppm ON up.perfil_id = ppm.perfil_id
WHERE u.auth_user_id = '3c844b5b-208a-4954-baf0-f870a8124870'
GROUP BY u.id, u.nombres, u.apellidos, u.email, u.estado;

-- Ver todos los permisos del usuario
SELECT 
    m.nombre as modulo,
    STRING_AGG(pm.codigo, ', ' ORDER BY pm.codigo) as permisos
FROM public.usuarios u
JOIN public.usuario_perfil up ON u.id = up.usuario_id
JOIN public.perfil_permiso_modulo ppm ON up.perfil_id = ppm.perfil_id
JOIN public.modulos m ON ppm.modulo_id = m.id
JOIN public.permisos pm ON ppm.permiso_id = pm.id
WHERE u.auth_user_id = '3c844b5b-208a-4954-baf0-f870a8124870'
GROUP BY m.nombre
ORDER BY m.nombre;
