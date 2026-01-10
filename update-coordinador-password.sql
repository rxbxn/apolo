-- Añadir columna password a la tabla coordinadores (si aún no existe)
ALTER TABLE public.coordinadores
ADD COLUMN IF NOT EXISTS password TEXT;

COMMENT ON COLUMN public.coordinadores.password IS 'Campo para almacenar (temporalmente) la contraseña asociada al coordinador. Considerar almacenar hash en producción.';
