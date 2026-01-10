-- =====================================================
-- MÓDULO: ALISTAMIENTO DEBATE
-- =====================================================

-- 1. Tabla: debate_planillas
CREATE TABLE IF NOT EXISTS public.debate_planillas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coordinador_id UUID REFERENCES public.coordinadores(id) ON DELETE SET NULL,
    militante_id UUID REFERENCES public.militantes(id) ON DELETE SET NULL,
    radicado INTEGER,
    cautivo INTEGER,
    marketing INTEGER,
    impacto INTEGER,
    fecha_planilla DATE NOT NULL,
    
    -- Auditoría
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creado_por UUID REFERENCES public.usuarios(id),
    actualizado_por UUID REFERENCES public.usuarios(id)
);

-- 2. Tabla: debate_inconsistencias
CREATE TABLE IF NOT EXISTS public.debate_inconsistencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coordinador_id UUID REFERENCES public.coordinadores(id) ON DELETE SET NULL,
    radical INTEGER,
    exclusion INTEGER,
    fuera_barranquilla INTEGER,
    fecha_inconsistencia DATE NOT NULL,
    fecha_resolucion DATE,
    cantidad_resuelto INTEGER,
    
    -- Auditoría
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creado_por UUID REFERENCES public.usuarios(id),
    actualizado_por UUID REFERENCES public.usuarios(id)
);

-- 3. Tabla: debate_casa_estrategica
CREATE TABLE IF NOT EXISTS public.debate_casa_estrategica (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coordinador_id UUID REFERENCES public.coordinadores(id) ON DELETE SET NULL,
    direccion TEXT NOT NULL,
    ciudad_id UUID REFERENCES public.ciudades(id) ON DELETE SET NULL,
    barrio_id UUID REFERENCES public.barrios(id) ON DELETE SET NULL,
    medidas VARCHAR(100),
    tipo_publicidad VARCHAR(100),
    fecha_instalacion DATE NOT NULL,
    fecha_desinstalacion DATE,
    
    -- Auditoría
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creado_por UUID REFERENCES public.usuarios(id),
    actualizado_por UUID REFERENCES public.usuarios(id)
);

-- 4. Tabla: debate_vehiculo_amigo
CREATE TABLE IF NOT EXISTS public.debate_vehiculo_amigo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coordinador_id UUID REFERENCES public.coordinadores(id) ON DELETE SET NULL,
    propietario VARCHAR(200) NOT NULL,
    placa VARCHAR(20) NOT NULL,
    tipo_vehiculo VARCHAR(50),
    fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    observaciones TEXT,
    
    -- Auditoría
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creado_por UUID REFERENCES public.usuarios(id),
    actualizado_por UUID REFERENCES public.usuarios(id)
);

-- 5. Tabla: debate_publicidad_vehiculo
CREATE TABLE IF NOT EXISTS public.debate_publicidad_vehiculo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coordinador_id UUID REFERENCES public.coordinadores(id) ON DELETE SET NULL,
    tipo_publicidad VARCHAR(100),
    medidas VARCHAR(100),
    ciudad_id UUID REFERENCES public.ciudades(id) ON DELETE SET NULL,
    barrio_id UUID REFERENCES public.barrios(id) ON DELETE SET NULL,
    fecha_instalacion DATE NOT NULL,
    fecha_desinstalacion DATE,
    
    -- Auditoría
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creado_por UUID REFERENCES public.usuarios(id),
    actualizado_por UUID REFERENCES public.usuarios(id)
);

-- Habilitar RLS
ALTER TABLE public.debate_planillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_inconsistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_casa_estrategica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_vehiculo_amigo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_publicidad_vehiculo ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (Simplificadas para usuarios autenticados por ahora)
CREATE POLICY "Auth users select planillas" ON public.debate_planillas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users insert planillas" ON public.debate_planillas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users update planillas" ON public.debate_planillas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users delete planillas" ON public.debate_planillas FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users select inconsistencias" ON public.debate_inconsistencias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users insert inconsistencias" ON public.debate_inconsistencias FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users update inconsistencias" ON public.debate_inconsistencias FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users delete inconsistencias" ON public.debate_inconsistencias FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users select casa_estrategica" ON public.debate_casa_estrategica FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users insert casa_estrategica" ON public.debate_casa_estrategica FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users update casa_estrategica" ON public.debate_casa_estrategica FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users delete casa_estrategica" ON public.debate_casa_estrategica FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users select vehiculo_amigo" ON public.debate_vehiculo_amigo FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users insert vehiculo_amigo" ON public.debate_vehiculo_amigo FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users update vehiculo_amigo" ON public.debate_vehiculo_amigo FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users delete vehiculo_amigo" ON public.debate_vehiculo_amigo FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users select publicidad_vehiculo" ON public.debate_publicidad_vehiculo FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users insert publicidad_vehiculo" ON public.debate_publicidad_vehiculo FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users update publicidad_vehiculo" ON public.debate_publicidad_vehiculo FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Auth users delete publicidad_vehiculo" ON public.debate_publicidad_vehiculo FOR DELETE USING (auth.role() = 'authenticated');

-- Registrar Módulo
INSERT INTO public.modulos (nombre, descripcion, icono, ruta, orden, activo)
VALUES ('Alistamiento Debate', 'Gestión administrativa de campaña', 'clipboard-list', '/dashboard/debate', 11, true)
ON CONFLICT (nombre) DO NOTHING;
