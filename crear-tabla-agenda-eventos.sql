-- SQL para crear la tabla agenda_eventos

CREATE TABLE IF NOT EXISTS public.agenda_eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(255) NOT NULL,
    fecha_inicio DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    fecha_fin DATE,
    hora_fin TIME,
    color VARCHAR(20) DEFAULT 'blanco' CHECK (color IN ('blanco', 'negro', 'gris', 'grisClaro')),
    descripcion TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios de la tabla
COMMENT ON TABLE public.agenda_eventos IS 'Tabla para almacenar eventos y actividades de la agenda.';
COMMENT ON COLUMN public.agenda_eventos.titulo IS 'Título del evento en la agenda.';
COMMENT ON COLUMN public.agenda_eventos.fecha_inicio IS 'Fecha de inicio del evento.';
COMMENT ON COLUMN public.agenda_eventos.hora_inicio IS 'Hora de inicio del evento.';
COMMENT ON COLUMN public.agenda_eventos.fecha_fin IS 'Fecha de finalización del evento (opcional).';
COMMENT ON COLUMN public.agenda_eventos.hora_fin IS 'Hora de finalización del evento (opcional).';
COMMENT ON COLUMN public.agenda_eventos.color IS 'Color del evento para visualización: blanco, negro, gris, grisClaro.';
COMMENT ON COLUMN public.agenda_eventos.descripcion IS 'Descripción detallada del evento (opcional).';
COMMENT ON COLUMN public.agenda_eventos.usuario_id IS 'ID del usuario que creó el evento.';

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_fecha_inicio ON public.agenda_eventos(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_usuario_id ON public.agenda_eventos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_activo ON public.agenda_eventos(activo);

-- Función para actualizar el campo actualizado_en automáticamente
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion_agenda_eventos()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente la fecha de modificación
CREATE TRIGGER trigger_actualizar_agenda_eventos_fecha_modificacion
    BEFORE UPDATE ON public.agenda_eventos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_modificacion_agenda_eventos();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;

-- Política para permitir a usuarios autenticados ver todos los eventos
CREATE POLICY "Usuarios autenticados pueden leer agenda_eventos"
    ON public.agenda_eventos FOR SELECT
    USING (auth.role() = 'authenticated');

-- Política para permitir a usuarios con permiso crear eventos
CREATE POLICY "Usuarios con permiso pueden crear agenda_eventos"
    ON public.agenda_eventos FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.usuarios u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.estado = 'activo'
        )
    );

-- Política para permitir a usuarios actualizar sus propios eventos o usuarios con permiso especial
CREATE POLICY "Usuarios pueden actualizar sus propios agenda_eventos"
    ON public.agenda_eventos FOR UPDATE
    USING (
        usuario_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.usuarios u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.estado = 'activo'
            AND (u.cargo_actual = 'super_admin' OR u.cargo_actual = 'coordinador')
        )
    );

-- Política para permitir a usuarios eliminar sus propios eventos o usuarios con permiso especial
CREATE POLICY "Usuarios pueden eliminar sus propios agenda_eventos"
    ON public.agenda_eventos FOR DELETE
    USING (
        usuario_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.usuarios u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.estado = 'activo'
            AND (u.cargo_actual = 'super_admin' OR u.cargo_actual = 'coordinador')
        )
    );

-- Insertar algunos datos de ejemplo
INSERT INTO public.agenda_eventos (titulo, fecha_inicio, hora_inicio, fecha_fin, hora_fin, color, descripcion)
VALUES 
    ('REUNIÓN DE COORDINADORES', '2026-01-14', '09:00:00', '2026-01-14', '11:00:00', 'gris', 'Reunión semanal del equipo coordinador'),
    ('VISITA BARRIAL - CENTRO', '2026-01-14', '14:00:00', '2026-01-14', '17:00:00', 'blanco', 'Visita programada al barrio centro'),
    ('EVENTO DE LANZAMIENTO', '2026-01-15', '18:00:00', '2026-01-15', '22:00:00', 'negro', 'Evento de lanzamiento de nueva campaña'),
    ('CAPACITACIÓN DE VOLUNTARIOS', '2026-01-16', '10:00:00', '2026-01-16', '15:00:00', 'blanco', 'Capacitación mensual para voluntarios'),
    ('REUNIÓN CON LÍDERES', '2026-01-16', '15:30:00', '2026-01-16', '17:30:00', 'grisClaro', 'Reunión con líderes comunitarios')
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✅ Tabla agenda_eventos creada con políticas RLS aplicadas.';
    RAISE NOTICE '📅 Eventos de ejemplo insertados para enero 2026.';
    RAISE NOTICE '🎨 Colores disponibles: blanco, negro, gris, grisClaro.';
END $$;