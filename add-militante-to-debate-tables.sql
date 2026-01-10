-- Agregar columna militante_id a debate_inconsistencias
ALTER TABLE public.debate_inconsistencias 
ADD COLUMN IF NOT EXISTS militante_id UUID REFERENCES public.militantes(id) ON DELETE SET NULL;

-- Agregar columna militante_id a debate_casa_estrategica
ALTER TABLE public.debate_casa_estrategica 
ADD COLUMN IF NOT EXISTS militante_id UUID REFERENCES public.militantes(id) ON DELETE SET NULL;
