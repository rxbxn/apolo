-- =====================================================
-- ARREGLAR VISTA PARA MOSTRAR FORMULARIOS
-- =====================================================

-- Crear una vista simplificada que funcione
CREATE OR REPLACE VIEW public.v_formularios_gestion_simple AS
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
    
    -- Solo nombres básicos sin JOINs complejos
    COALESCE(u_mil.nombres || ' ' || u_mil.apellidos, 'Sin asignar') as militante_nombre,
    COALESCE(u_coord.nombres || ' ' || u_coord.apellidos, 'Sin asignar') as coordinador_nombre,
    COALESCE(u_dir.nombres || ' ' || u_dir.apellidos, 'Sin asignar') as dirigente_nombre
    
FROM public.formularios_gestion fg

-- JOINs más simples y seguros
LEFT JOIN public.militantes m ON fg.militante_id = m.id
LEFT JOIN public.usuarios u_mil ON m.usuario_id = u_mil.id

LEFT JOIN public.coordinadores coord ON fg.coordinador_id = coord.id
LEFT JOIN public.usuarios u_coord ON coord.usuario_id = u_coord.id

LEFT JOIN public.coordinadores dirigente ON fg.dirigente_id = dirigente.id
LEFT JOIN public.usuarios u_dir ON dirigente.usuario_id = u_dir.id

ORDER BY fg.creado_en DESC;

-- =====================================================
-- ACTUALIZAR FUNCIÓN getGestionById PARA USAR VISTA SIMPLE
-- =====================================================

-- Test de la vista simple
SELECT 'TEST VISTA SIMPLE:' as tipo;
SELECT id, numero_formulario, militante_nombre, coordinador_nombre 
FROM public.v_formularios_gestion_simple 
LIMIT 5;

-- =====================================================
-- VERIFICAR DATOS ESPECÍFICOS DEL FORMULARIO GG-001
-- =====================================================

SELECT 'DATOS FORMULARIO GG-001:' as tipo;
SELECT * FROM public.formularios_gestion 
WHERE numero_formulario = 'GG-001';

SELECT 'VISTA SIMPLE GG-001:' as tipo;
SELECT * FROM public.v_formularios_gestion_simple 
WHERE numero_formulario = 'GG-001';

-- =====================================================
-- COMENTARIOS
-- =====================================================
-- Esta vista simplificada:
-- ✅ Evita JOINs complejos que pueden fallar
-- ✅ Usa COALESCE para evitar valores nulos
-- ✅ Mantiene todos los campos necesarios
-- ✅ Es más estable para consultas por ID