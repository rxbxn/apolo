-- Crear vista v_militantes_completo
-- Esta vista combina datos de militantes con usuarios para mostrar información completa

CREATE OR REPLACE VIEW public.v_militantes_completo AS
SELECT 
    m.id as militante_id,
    m.usuario_id,
    m.tipo,
    m.coordinador_id,
    m.compromiso_marketing,
    m.compromiso_cautivo,
    m.compromiso_impacto,
    m.formulario,
    m.estado,
    m.creado_en,
    m.actualizado_en,
    
    -- Datos del usuario
    u.nombres,
    u.apellidos,
    u.tipo_documento,
    u.numero_documento,
    u.email,
    u.celular,
    u.whatsapp,
    u.telefono_fijo,
    u.direccion,
    u.fecha_nacimiento,
    u.genero,
    u.estado_civil,
    
    -- Datos de ubicación
    u.ciudad_id,
    u.ciudad_nombre,
    u.localidad_id,
    u.localidad_nombre,
    u.barrio_id,
    u.barrio_nombre,
    u.zona_id,
    u.zona_nombre,
    
    -- Datos demográficos
    u.nivel_escolaridad,
    u.perfil_ocupacion,
    u.tipo_vivienda,
    u.estrato,
    u.ingresos_rango,
    u.tiene_hijos,
    u.numero_hijos,
    
    -- Redes sociales
    u.facebook,
    u.instagram,
    u.twitter,
    u.linkedin,
    u.tiktok,
    
    -- Otros campos del usuario
    u.observaciones,
    u.lider_responsable,
    
    -- Información del coordinador (si existe)
    c.email as coordinador_email,
    CONCAT(uc.nombres, ' ', uc.apellidos) as coordinador_nombre
    
FROM public.militantes m
LEFT JOIN public.usuarios u ON m.usuario_id = u.id
LEFT JOIN public.coordinadores c ON m.coordinador_id = c.id
LEFT JOIN public.usuarios uc ON c.usuario_id = uc.id;

-- Agregar comentario
COMMENT ON VIEW public.v_militantes_completo IS 'Vista completa de militantes con información de usuarios y coordinadores asociados';

-- Otorgar permisos de lectura
GRANT SELECT ON public.v_militantes_completo TO authenticated;
GRANT SELECT ON public.v_militantes_completo TO anon;