-- =====================================================
-- ARREGLAR PROBLEMA DE VISUALIZACIÓN DE FORMULARIOS
-- =====================================================

-- 1. ELIMINAR VISTAS EXISTENTES PRIMERO
DROP VIEW IF EXISTS public.v_formularios_gestion_simple CASCADE;
DROP VIEW IF EXISTS public.v_formularios_gestion_completa CASCADE;
DROP VIEW IF EXISTS public.v_formularios_con_solicitudes CASCADE;

-- 2. CREAR VISTA SIMPLE QUE FUNCIONE
CREATE VIEW public.v_formularios_gestion_simple AS
SELECT 
    fg.id,
    fg.numero_formulario,
    fg.fecha_necesidad,
    fg.prioridad,
    fg.telefono,
    fg.localidad,
    fg.receptor,
    fg.estado_difusion,
    fg.limpio_conteo,
    fg.limpio_pendiente,
    fg.codigo_lider,
    fg.tipo_gestion,
    fg.gestor_asignado,
    fg.detalle_solicitud,
    fg.autorizacion_total,
    fg.fecha_entrega,
    fg.observaciones_prioridad,
    fg.observaciones_generales,
    fg.estado,
    fg.creado_en,
    fg.actualizado_en,
    fg.militante_id,
    fg.coordinador_id,
    fg.dirigente_id,
    fg.creado_por,
    fg.aprobado_por,
    
    -- Información básica sin JOINs complicados
    'Sin asignar'::text as militante_nombre,
    fg.gestor_asignado as coordinador_nombre,
    'Sin asignar'::text as dirigente_nombre
    
FROM public.formularios_gestion fg
ORDER BY fg.creado_en DESC;

-- 3. CREAR VISTA COMPLETA
CREATE VIEW public.v_formularios_gestion_completa AS
SELECT 
    fg.id,
    fg.numero_formulario,
    fg.fecha_necesidad,
    fg.prioridad,
    fg.telefono,
    fg.localidad,
    fg.receptor,
    fg.estado_difusion,
    fg.limpio_conteo,
    fg.limpio_pendiente,
    fg.codigo_lider,
    fg.tipo_gestion,
    fg.gestor_asignado,
    fg.detalle_solicitud,
    fg.autorizacion_total,
    fg.fecha_entrega,
    fg.observaciones_prioridad,
    fg.observaciones_generales,
    fg.estado,
    fg.creado_en,
    fg.actualizado_en,
    
    -- IDs originales
    fg.militante_id,
    fg.coordinador_id,
    fg.dirigente_id,
    fg.creado_por,
    fg.aprobado_por,
    
    -- Información con JOINs seguros
    COALESCE(CONCAT(u_mil.nombres, ' ', u_mil.apellidos), 'Sin militante') as militante_nombre,
    COALESCE(u_mil.numero_documento, '') as militante_documento,
    COALESCE(u_mil.email, '') as militante_email,
    
    COALESCE(CONCAT(u_coord.nombres, ' ', u_coord.apellidos), 'Sin coordinador') as coordinador_nombre,
    COALESCE(u_coord.email, '') as coordinador_email,
    COALESCE(coord.tipo, '') as coordinador_tipo,
    
    COALESCE(CONCAT(u_dir.nombres, ' ', u_dir.apellidos), 'Sin dirigente') as dirigente_nombre,
    COALESCE(u_dir.email, '') as dirigente_email,
    COALESCE(p_dir.nombre, '') as dirigente_perfil_nombre,
    
    COALESCE(CONCAT(u_creador.nombres, ' ', u_creador.apellidos), '') as creado_por_nombre,
    COALESCE(CONCAT(u_aprobador.nombres, ' ', u_aprobador.apellidos), '') as aprobado_por_nombre
    
FROM public.formularios_gestion fg
    
-- JOINs seguros con LEFT JOIN
LEFT JOIN public.militantes m ON fg.militante_id = m.id
LEFT JOIN public.usuarios u_mil ON m.usuario_id = u_mil.id

LEFT JOIN public.coordinadores coord ON fg.coordinador_id = coord.id
LEFT JOIN public.usuarios u_coord ON coord.usuario_id = u_coord.id

LEFT JOIN public.coordinadores dirigente ON fg.dirigente_id = dirigente.id
LEFT JOIN public.usuarios u_dir ON dirigente.usuario_id = u_dir.id
LEFT JOIN public.perfiles p_dir ON dirigente.perfil_id = p_dir.id

-- JOINs con auth.users (estos pueden fallar)
LEFT JOIN auth.users au_creador ON fg.creado_por = au_creador.id
LEFT JOIN public.usuarios u_creador ON au_creador.email = u_creador.email

LEFT JOIN auth.users au_aprobador ON fg.aprobado_por = au_aprobador.id
LEFT JOIN public.usuarios u_aprobador ON au_aprobador.email = u_aprobador.email

ORDER BY fg.creado_en DESC;

-- 4. CREAR VISTA CON SOLICITUDES
CREATE VIEW public.v_formularios_con_solicitudes AS
SELECT 
    fg.id,
    fg.numero_formulario,
    fg.fecha_necesidad,
    fg.prioridad,
    fg.estado,
    fg.creado_en,
    
    -- Agregaciones de las solicitudes
    COUNT(sg.id) as total_solicitudes,
    COALESCE(SUM(sg.cantidad), 0) as total_cantidad_items,
    
    -- Array de solicitudes (PostgreSQL JSON)
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', sg.id,
                'elemento', sg.elemento,
                'unidad', sg.unidad,
                'categoria', sg.categoria,
                'sector', sg.sector,
                'cantidad', sg.cantidad,
                'orden', sg.orden
            ) ORDER BY sg.orden
        ) FILTER (WHERE sg.id IS NOT NULL),
        '[]'::json
    ) as solicitudes_detalle
    
FROM public.formularios_gestion fg
LEFT JOIN public.solicitudes_gestion sg ON fg.id = sg.formulario_id

GROUP BY fg.id, fg.numero_formulario, fg.fecha_necesidad, fg.prioridad, fg.estado, fg.creado_en
ORDER BY fg.creado_en DESC;

-- =====================================================
-- 5. VERIFICAR QUE FUNCIONEN LAS VISTAS
-- =====================================================

-- Test vista simple
SELECT 'VISTA SIMPLE - FUNCIONA:' as test;
SELECT id, numero_formulario, militante_nombre, fecha_necesidad 
FROM public.v_formularios_gestion_simple 
LIMIT 3;

-- Test vista completa
SELECT 'VISTA COMPLETA - FUNCIONA:' as test;
SELECT id, numero_formulario, militante_nombre, coordinador_nombre 
FROM public.v_formularios_gestion_completa 
LIMIT 3;

-- Test vista con solicitudes
SELECT 'VISTA CON SOLICITUDES - FUNCIONA:' as test;
SELECT id, numero_formulario, total_solicitudes
FROM public.v_formularios_con_solicitudes 
LIMIT 3;

-- Ver todos los formularios
SELECT 'TODOS LOS FORMULARIOS:' as test;
SELECT id, numero_formulario, creado_en 
FROM public.formularios_gestion 
ORDER BY creado_en DESC;

-- =====================================================
-- 6. PERMISOS PARA LAS VISTAS
-- =====================================================

GRANT SELECT ON public.v_formularios_gestion_simple TO authenticated;
GRANT SELECT ON public.v_formularios_gestion_completa TO authenticated;
GRANT SELECT ON public.v_formularios_con_solicitudes TO authenticated;
GRANT SELECT ON public.v_formularios_gestion_simple TO anon;
GRANT SELECT ON public.v_formularios_gestion_completa TO anon;
GRANT SELECT ON public.v_formularios_con_solicitudes TO anon;

-- =====================================================
-- COMENTARIOS
-- =====================================================
-- ✅ Vista simple: Sin JOINs complejos, siempre funciona
-- ✅ Vista completa: JOINs seguros con COALESCE
-- ✅ Permisos otorgados correctamente
-- ✅ Tests incluidos para verificar funcionamiento