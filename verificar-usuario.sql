-- =====================================================
-- VERIFICAR USUARIO CREADO
-- =====================================================

-- 1. Verificar que el usuario existe en la tabla usuarios
SELECT 
    id,
    auth_user_id,
    nombres,
    apellidos,
    email,
    numero_documento,
    estado,
    creado_en
FROM public.usuarios
WHERE email = 'araujocarpio@gmail.com'
   OR auth_user_id = '3c844b5b-208a-4954-baf0-f870a8124870';

-- 2. Si NO aparece ningún resultado, ejecuta este INSERT:
INSERT INTO public.usuarios (
    auth_user_id,
    tipo_documento,
    numero_documento,
    nombres,
    apellidos,
    email,
    estado
) VALUES (
    '3c844b5b-208a-4954-baf0-f870a8124870',
    'Cédula',
    '1234567890',
    'Administrador',
    'Sistema',
    'araujocarpio@gmail.com',
    'activo'
)
ON CONFLICT (numero_documento) DO UPDATE
SET auth_user_id = EXCLUDED.auth_user_id,
    email = EXCLUDED.email;

-- 3. Verificar que tiene perfil asignado
SELECT 
    u.nombres,
    u.apellidos,
    p.nombre as perfil,
    up.activo
FROM public.usuarios u
LEFT JOIN public.usuario_perfil up ON u.id = up.usuario_id
LEFT JOIN public.perfiles p ON up.perfil_id = p.id
WHERE u.email = 'araujocarpio@gmail.com';

-- 4. Si NO tiene perfil, asignar Super Admin:
INSERT INTO public.usuario_perfil (
    usuario_id,
    perfil_id,
    es_principal,
    activo
)
SELECT 
    u.id,
    (SELECT id FROM public.perfiles WHERE nombre = 'Super Admin' LIMIT 1),
    true,
    true
FROM public.usuarios u
WHERE u.email = 'araujocarpio@gmail.com'
ON CONFLICT (usuario_id, perfil_id) DO UPDATE
SET activo = true, es_principal = true;

-- 5. Verificar permisos finales
SELECT 
    COUNT(DISTINCT ppm.modulo_id) as total_modulos,
    COUNT(DISTINCT ppm.permiso_id) as total_permisos
FROM public.usuarios u
JOIN public.usuario_perfil up ON u.id = up.usuario_id
JOIN public.perfil_permiso_modulo ppm ON up.perfil_id = ppm.perfil_id
WHERE u.email = 'araujocarpio@gmail.com';
