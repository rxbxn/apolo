-- SQL para actualizar la vista v_militantes_completo
-- Se añade la descripción del tipo de militante

CREATE OR REPLACE VIEW public.v_militantes_completo AS
SELECT 
    m.id as militante_id,
    m.tipo,
    tm.descripcion as tipo_descripcion, -- Campo añadido
    tm.codigo as tipo_codigo,
    m.estado,
    m.compromiso_marketing,
    m.compromiso_cautivo,
    m.compromiso_impacto,
    m.formulario,
    u.id as usuario_id,
    u.nombres,
    u.apellidos,
    u.numero_documento,
    u.tipo_documento,
    u.celular,
    u.email as usuario_email,
    ciudad.nombre as ciudad_nombre,
    zona.nombre as zona_nombre,
    p.nombre as perfil_nombre,
    p.id as perfil_id,
    coord.id as coordinador_id,
    coord.email as coordinador_email,
    coord_usuario.nombres || ' ' || coord_usuario.apellidos as coordinador_nombre,
    m.creado_en,
    m.actualizado_en
FROM public.militantes m
INNER JOIN public.usuarios u ON m.usuario_id = u.id
LEFT JOIN public.perfiles p ON m.perfil_id = p.id
LEFT JOIN public.ciudades ciudad ON u.ciudad_id = ciudad.id
LEFT JOIN public.zonas zona ON u.zona_id = zona.id
LEFT JOIN public.coordinadores coord ON m.coordinador_id = coord.id
LEFT JOIN public.usuarios coord_usuario ON coord.usuario_id = coord_usuario.id
LEFT JOIN public.tipos_militante tm ON CAST(m.tipo AS INTEGER) = tm.codigo; -- Join añadido (m.tipo puede ser código numérico)

COMMENT ON VIEW public.v_militantes_completo IS 'Vista de militantes con información completa, incluyendo descripción del tipo de militante.';

DO $$
BEGIN
    RAISE NOTICE '✅ Vista v_militantes_completo actualizada para incluir tipo_descripcion.';
END $$;
