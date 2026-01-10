-- Script para agregar soporte de Puestos y Mesas de Votación

-- 1. Crear tabla de Puestos de Votación
CREATE TABLE IF NOT EXISTS public.puestos_votacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    direccion VARCHAR(200),
    ciudad_id UUID REFERENCES public.ciudades(id) ON DELETE CASCADE,
    localidad_id UUID REFERENCES public.localidades(id) ON DELETE SET NULL,
    barrio_id UUID REFERENCES public.barrios(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT true,
    
    -- Auditoría
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_puestos_ciudad ON public.puestos_votacion(ciudad_id);
CREATE INDEX IF NOT EXISTS idx_puestos_nombre ON public.puestos_votacion(nombre);

-- RLS
ALTER TABLE public.puestos_votacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer puestos_votacion"
    ON public.puestos_votacion FOR SELECT
    USING (auth.role() = 'authenticated');

-- 2. Agregar columnas a la tabla usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS puesto_votacion_id UUID REFERENCES public.puestos_votacion(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS mesa_votacion VARCHAR(20);

-- Índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_usuarios_puesto ON public.usuarios(puesto_votacion_id);

-- 3. Insertar algunos datos de prueba (Opcional)
-- INSERT INTO public.puestos_votacion (nombre, ciudad_id) 
-- SELECT 'Puesto Central', id FROM public.ciudades WHERE nombre = 'Bogotá' LIMIT 1;
