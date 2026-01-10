-- Habilitar RLS para la tabla persona
ALTER TABLE public.persona ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden leer personas"
ON public.persona FOR SELECT
TO authenticated
USING (true);

-- Política para permitir inserción a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden insertar personas"
ON public.persona FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para permitir actualización a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden actualizar personas"
ON public.persona FOR UPDATE
TO authenticated
USING (true);

-- Política para permitir eliminación a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden eliminar personas"
ON public.persona FOR DELETE
TO authenticated
USING (true);
