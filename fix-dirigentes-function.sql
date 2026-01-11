-- =====================================================
-- CORREGIR FUNCIÓN OBTENER DIRIGENTES
-- =====================================================

-- Actualizar la función para obtener dirigentes correctamente
CREATE OR REPLACE FUNCTION public.obtener_dirigentes()
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    email VARCHAR,
    perfil_nombre VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        CONCAT(u.nombres, ' ', u.apellidos) as nombre,
        u.email,
        p.nombre as perfil_nombre
    FROM public.coordinadores c
    JOIN public.usuarios u ON c.usuario_id = u.id
    JOIN public.perfiles p ON c.perfil_id = p.id
    WHERE p.nombre = 'Dirigente'
      AND c.estado = 'activo'
    ORDER BY u.nombres, u.apellidos;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN PARA OBTENER LOCALIDADES
-- =====================================================

-- Crear función para obtener localidades activas
CREATE OR REPLACE FUNCTION public.obtener_localidades()
RETURNS TABLE (
    id UUID,
    nombre VARCHAR,
    codigo VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.nombre,
        l.codigo
    FROM public.localidades l
    WHERE l.activo = true
    ORDER BY l.nombre;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICAR QUE LAS FUNCIONES FUNCIONEN
-- =====================================================

-- Ejecutar las funciones para probar
SELECT 'DIRIGENTES:' as tipo;
SELECT * FROM obtener_dirigentes();

SELECT 'LOCALIDADES:' as tipo;
SELECT * FROM obtener_localidades();

-- =====================================================
-- VERIFICAR VISTA DE FORMULARIOS
-- =====================================================

-- Verificar si la vista funciona
SELECT 'FORMULARIOS EN TABLA PRINCIPAL:' as tipo;
SELECT id, numero_formulario, fecha_necesidad, creado_en 
FROM public.formularios_gestion 
ORDER BY creado_en DESC 
LIMIT 5;

SELECT 'FORMULARIOS EN VISTA COMPLETA:' as tipo;
SELECT id, numero_formulario, fecha_necesidad, creado_en 
FROM public.v_formularios_gestion_completa 
ORDER BY creado_en DESC 
LIMIT 5;

-- =====================================================
-- TEST DE OBTENER POR ID
-- =====================================================

-- Obtener un ID existente para prueba
DO $$
DECLARE
    test_id UUID;
BEGIN
    SELECT id INTO test_id 
    FROM public.formularios_gestion 
    LIMIT 1;
    
    IF test_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with ID: %', test_id;
        
        -- Test tabla principal
        PERFORM * FROM public.formularios_gestion WHERE id = test_id;
        RAISE NOTICE 'Tabla principal: OK';
        
        -- Test vista
        PERFORM * FROM public.v_formularios_gestion_completa WHERE id = test_id;
        RAISE NOTICE 'Vista completa: OK';
        
    ELSE
        RAISE NOTICE 'No hay formularios para probar';
    END IF;
END $$;

-- =====================================================
-- COMENTARIOS
-- =====================================================
-- Función dirigentes:
-- ✅ Hace JOIN entre coordinadores y perfiles
-- ✅ Filtra por perfil.nombre = 'Dirigente' exactamente
-- ✅ Solo trae coordinadores activos
-- ✅ Ordena por nombre del usuario

-- Función localidades:
-- ✅ Trae todas las localidades activas
-- ✅ Incluye código y nombre
-- ✅ Ordenado por nombre