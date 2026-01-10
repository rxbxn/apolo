-- =====================================================
-- SCRIPT: Asignar Permisos del Módulo Militante al Super Admin
-- =====================================================
-- Este script asigna todos los permisos del módulo Militante
-- al perfil "Super Admin" para que el super admin pueda acceder al módulo
-- =====================================================

-- PASO 1: Verificar que el módulo Militante existe
DO $$
DECLARE
    modulo_existe BOOLEAN;
    modulo_id UUID;
BEGIN
    SELECT EXISTS(SELECT 1 FROM public.modulos WHERE nombre = 'Módulo Militante')
    INTO modulo_existe;
    
    IF NOT modulo_existe THEN
        RAISE EXCEPTION '❌ El módulo "Módulo Militante" no existe. Ejecuta primero el schema.sql para agregar el módulo';
    END IF;
    
    SELECT id INTO modulo_id
    FROM public.modulos 
    WHERE nombre = 'Módulo Militante';
    
    RAISE NOTICE '✅ Módulo Militante encontrado con ID: %', modulo_id;
END $$;

-- PASO 2: Verificar que el perfil Super Admin existe
DO $$
DECLARE
    perfil_existe BOOLEAN;
    perfil_id UUID;
BEGIN
    SELECT EXISTS(SELECT 1 FROM public.perfiles WHERE nombre = 'Super Admin')
    INTO perfil_existe;
    
    IF NOT perfil_existe THEN
        -- Crear el perfil Super Admin si no existe
        INSERT INTO public.perfiles (nombre, descripcion, nivel_jerarquico, activo)
        VALUES ('Super Admin', 'Administrador con acceso total al sistema', 0, true)
        RETURNING id INTO perfil_id;
        
        RAISE NOTICE '✅ Perfil Super Admin creado';
    ELSE
        SELECT id INTO perfil_id
        FROM public.perfiles 
        WHERE nombre = 'Super Admin';
        
        RAISE NOTICE '✅ Perfil Super Admin encontrado con ID: %', perfil_id;
    END IF;
END $$;

-- PASO 3: Asignar TODOS los permisos del módulo Militante al perfil Super Admin
-- Esto incluye todos los permisos disponibles (CREATE, READ, UPDATE, DELETE, EXPORT, IMPORT, etc.)
INSERT INTO public.perfil_permiso_modulo (perfil_id, modulo_id, permiso_id)
SELECT 
    (SELECT id FROM public.perfiles WHERE nombre = 'Super Admin'),
    m.id,
    p.id
FROM public.modulos m
CROSS JOIN public.permisos p
WHERE m.nombre = 'Módulo Militante'
ON CONFLICT (perfil_id, modulo_id, permiso_id) DO NOTHING;

-- PASO 4: Verificar los permisos asignados
DO $$
DECLARE
    total_permisos INTEGER;
    permisos_detalle TEXT;
BEGIN
    SELECT COUNT(*) INTO total_permisos
    FROM public.perfil_permiso_modulo ppm
    JOIN public.perfiles pf ON ppm.perfil_id = pf.id
    JOIN public.modulos m ON ppm.modulo_id = m.id
    JOIN public.permisos p ON ppm.permiso_id = p.id
    WHERE pf.nombre = 'Super Admin'
    AND m.nombre = 'Módulo Militante';
    
    SELECT STRING_AGG(p.codigo, ', ' ORDER BY p.codigo)
    INTO permisos_detalle
    FROM public.perfil_permiso_modulo ppm
    JOIN public.perfiles pf ON ppm.perfil_id = pf.id
    JOIN public.modulos m ON ppm.modulo_id = m.id
    JOIN public.permisos p ON ppm.permiso_id = p.id
    WHERE pf.nombre = 'Super Admin'
    AND m.nombre = 'Módulo Militante';
    
    RAISE NOTICE '✅ Permisos asignados al Super Admin: %', total_permisos;
    RAISE NOTICE '📋 Permisos del módulo Militante: %', permisos_detalle;
END $$;

-- PASO 5: Mostrar resumen final
SELECT 
    pf.nombre as perfil,
    m.nombre as modulo,
    STRING_AGG(p.codigo, ', ' ORDER BY p.codigo) as permisos,
    COUNT(*) as total_permisos
FROM public.perfiles pf
JOIN public.perfil_permiso_modulo ppm ON pf.id = ppm.perfil_id
JOIN public.modulos m ON ppm.modulo_id = m.id
JOIN public.permisos p ON ppm.permiso_id = p.id
WHERE pf.nombre = 'Super Admin'
AND m.nombre = 'Módulo Militante'
GROUP BY pf.nombre, m.nombre;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- Ejecuta este script en Supabase SQL Editor
-- Verifica que el usuario tenga los permisos correctos
-- =====================================================

