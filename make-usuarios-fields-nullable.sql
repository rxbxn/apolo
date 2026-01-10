-- Make fields nullable in usuarios table
ALTER TABLE public.usuarios ALTER COLUMN nombres DROP NOT NULL;
ALTER TABLE public.usuarios ALTER COLUMN apellidos DROP NOT NULL;
ALTER TABLE public.usuarios ALTER COLUMN tipo_documento DROP NOT NULL;
ALTER TABLE public.usuarios ALTER COLUMN numero_documento DROP NOT NULL;
