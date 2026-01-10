-- SQL para insertar el nuevo módulo de Configuración

INSERT INTO public.modulos (nombre, descripcion, orden, obligatorio, ruta, icono)
VALUES (
    'Configuración', 
    'Módulo para configuraciones generales del sistema.', 
    11, 
    false, 
    '/dashboard/configuracion', 
    'settings'
)
ON CONFLICT (nombre) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✅ Módulo de Configuración insertado en la tabla de módulos.';
END $$;
