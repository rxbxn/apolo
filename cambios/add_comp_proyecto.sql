-- Agregar comp_proyecto a usuarios y poblar desde tabla persona
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS comp_proyecto TEXT;

-- Poblar desde la tabla persona antigua (join por cedula/numero_documento)
UPDATE public.usuarios u
SET comp_proyecto = p.comp_proyecto
FROM public.persona p
WHERE u.numero_documento = p.cedula::TEXT
  AND p.comp_proyecto IS NOT NULL
  AND p.comp_proyecto <> '';
