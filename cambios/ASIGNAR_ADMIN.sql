-- ============================================================
--  ASIGNAR PERFIL SUPER ADMIN AL USUARIO ADMINISTRADOR
--  Ejecutar en: https://72-61-64-225.sslip.io/project/default → SQL Editor
-- ============================================================

-- 1. Ver qué usuarios existen en auth.users (para identificar al admin)
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at
LIMIT 20;

-- 2. Ver qué usuarios en la tabla usuarios tienen auth_user_id
SELECT u.id, u.nombres, u.apellidos, u.email, u.auth_user_id
FROM public.usuarios u
WHERE u.auth_user_id IS NOT NULL
LIMIT 20;

-- 3. Ver coordinadores con auth_user_id (el admin puede estar aquí)
SELECT c.id as coord_id, c.email, c.auth_user_id, c.usuario_id,
       u.nombres, u.apellidos
FROM public.coordinadores c
LEFT JOIN public.usuarios u ON u.id = c.usuario_id
WHERE c.auth_user_id IS NOT NULL
LIMIT 20;

-- ============================================================
-- 4. ASIGNAR SUPER ADMIN AL USUARIO ADMINISTRADOR
--    Reemplaza '<EMAIL_DEL_ADMIN>' con tu email real (ej: ruben@dcmsystem.co)
-- ============================================================

DO $$
DECLARE
    v_auth_id   UUID;
    v_usuario_id UUID;
    v_perfil_id  UUID;
BEGIN
    -- Buscar auth_user_id por email del administrador
    SELECT id INTO v_auth_id
    FROM auth.users
    WHERE email = 'ruben@dcmsystem.co'
    LIMIT 1;

    IF v_auth_id IS NULL THEN
        RAISE NOTICE 'No se encontró usuario con ese email en auth.users';
        RETURN;
    END IF;

    -- Obtener perfil Super Admin
    SELECT id INTO v_perfil_id
    FROM public.perfiles
    WHERE nombre = 'Super Admin'
    LIMIT 1;

    IF v_perfil_id IS NULL THEN
        -- Crear perfil Super Admin si no existe
        INSERT INTO public.perfiles (nombre, descripcion, nivel_jerarquico, activo)
        VALUES ('Super Admin', 'Administrador del sistema', 1, true)
        RETURNING id INTO v_perfil_id;
        RAISE NOTICE 'Perfil Super Admin creado: %', v_perfil_id;
    END IF;

    -- Buscar usuario en tabla usuarios por auth_user_id
    SELECT id INTO v_usuario_id
    FROM public.usuarios
    WHERE auth_user_id = v_auth_id
    LIMIT 1;

    IF v_usuario_id IS NULL THEN
        -- Buscar por coordinadores como fallback
        SELECT usuario_id INTO v_usuario_id
        FROM public.coordinadores
        WHERE auth_user_id = v_auth_id
        LIMIT 1;
    END IF;

    IF v_usuario_id IS NULL THEN
        -- El admin no tiene registro en usuarios todavía; crear uno mínimo
        INSERT INTO public.usuarios (
            tipo_documento, numero_documento, nombres, apellidos,
            email, auth_user_id, estado
        )
        SELECT 'CC', 'ADMIN001', 'Administrador', 'Sistema',
               au.email, au.id, 'activo'
        FROM auth.users au
        WHERE au.id = v_auth_id
        RETURNING id INTO v_usuario_id;
        RAISE NOTICE 'Usuario administrador creado: %', v_usuario_id;
    END IF;

    -- Actualizar auth_user_id en usuarios si falta
    UPDATE public.usuarios
    SET auth_user_id = v_auth_id
    WHERE id = v_usuario_id AND auth_user_id IS NULL;

    -- Asignar perfil Super Admin
    INSERT INTO public.usuario_perfil (usuario_id, perfil_id, es_principal, activo)
    VALUES (v_usuario_id, v_perfil_id, true, true)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '✅ Super Admin asignado: usuario_id=% perfil_id=%', v_usuario_id, v_perfil_id;
END $$;

-- ============================================================
-- 5. VERIFICACIÓN: permisos, módulos y asignaciones
-- ============================================================

-- Ver permisos configurados
SELECT COUNT(*) as total_permisos FROM public.permisos;

-- Ver módulos
SELECT COUNT(*) as total_modulos FROM public.modulos;

-- Ver perfil_permiso_modulo
SELECT COUNT(*) as total_ppm FROM public.perfil_permiso_modulo;

-- Ver el usuario admin y su perfil
SELECT u.nombres, u.apellidos, u.email, u.auth_user_id,
       p.nombre as perfil, up.activo
FROM public.usuarios u
JOIN public.usuario_perfil up ON up.usuario_id = u.id
JOIN public.perfiles p ON p.id = up.perfil_id
WHERE p.nombre = 'Super Admin';
