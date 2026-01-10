-- Agregar campo ubicacion_manual a la tabla usuarios
-- Este campo permitirá que los usuarios ingresen ubicación manualmente
-- cuando no encuentren su ubicación en las listas

ALTER TABLE public.usuarios 
ADD COLUMN ubicacion_manual boolean DEFAULT false;

-- Comentario para documentar el campo
COMMENT ON COLUMN public.usuarios.ubicacion_manual IS 'Indica si el usuario prefiere ingresar su ubicación manualmente en lugar de usar las listas desplegables';

-- Actualizar el timestamp de actualización para registros existentes (opcional)
-- UPDATE public.usuarios SET actualizado_en = NOW() WHERE ubicacion_manual IS NULL;