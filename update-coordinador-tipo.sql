-- Agregar columna tipo a coordinadores
ALTER TABLE public.coordinadores 
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) CHECK (tipo IN ('Coordinador', 'Estructurador'));

-- Actualizar la vista para incluir el tipo
DROP VIEW IF EXISTS public.v_coordinadores_completo;
CREATE VIEW public.v_coordinadores_completo AS
SELECT 
    c.id as coordinador_id,
    c.email,
    c.estado,
    c.tipo,
    u.id as usuario_id,
    u.nombres,
    u.apellidos,
    u.numero_documento,
    u.tipo_documento,
    u.celular,
    ciudad.nombre as ciudad_nombre,
    zona.nombre as zona_nombre,
    p.nombre as rol,
    p.id as perfil_id,
    ref_coord.id as referencia_id,
    ref_usuario.nombres || ' ' || ref_usuario.apellidos as referencia_nombre,
    c.creado_en,
    c.actualizado_en
FROM public.coordinadores c
LEFT JOIN public.usuarios u ON c.usuario_id = u.id
LEFT JOIN public.perfiles p ON c.perfil_id = p.id
LEFT JOIN public.ciudades ciudad ON u.ciudad_id = ciudad.id
LEFT JOIN public.zonas zona ON u.zona_id = zona.id
LEFT JOIN public.coordinadores ref_coord ON c.referencia_coordinador_id = ref_coord.id
LEFT JOIN public.usuarios ref_usuario ON ref_coord.usuario_id = ref_usuario.id;

COMMENT ON VIEW public.v_coordinadores_completo IS 'Vista de coordinadores con información completa de usuario, perfil y referencia';
