-- =====================================================
-- MODELO DE DATOS COMPLETO PARA GESTIÓN GERENCIAL
-- =====================================================

-- 1. TABLA PRINCIPAL: FORMULARIO DE GESTIÓN
-- =====================================================
CREATE TABLE IF NOT EXISTS public.formularios_gestion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Encabezado del Formulario
    numero_formulario VARCHAR(50) NOT NULL UNIQUE,
    fecha_necesidad DATE NOT NULL,
    prioridad VARCHAR(20) CHECK (prioridad IN ('alta', 'media', 'baja')),
    
    -- Información Personal y Contacto
    militante_id UUID REFERENCES public.militantes(id),
    dirigente_id UUID, -- Coordinadores con perfil dirigente
    coordinador_id UUID REFERENCES public.coordinadores(id),
    telefono VARCHAR(20),
    localidad VARCHAR(100),
    receptor VARCHAR(100),
    
    -- Indicadores
    estado_difusion VARCHAR(50) DEFAULT 'pendiente',
    limpio_conteo INTEGER DEFAULT 0,
    limpio_pendiente INTEGER DEFAULT 0,
    codigo_lider VARCHAR(50),
    
    -- Tipo de Gestión
    tipo_gestion VARCHAR(100),
    
    -- Solicitud y Gestor (de la nueva sección)
    gestor_asignado VARCHAR(200),
    detalle_solicitud TEXT,
    
    -- Autorización y Observaciones
    autorizacion_total DECIMAL(15,2) DEFAULT 0,
    fecha_entrega DATE,
    observaciones_prioridad TEXT,
    observaciones_generales TEXT,
    
    -- Estado del formulario
    estado VARCHAR(30) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviado', 'en_proceso', 'aprobado', 'rechazado', 'completado')),
    
    -- Metadatos
    creado_por UUID REFERENCES auth.users(id),
    aprobado_por UUID REFERENCES auth.users(id),
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA PARA SOLICITUDES DE GESTIÓN (DETALLE)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.solicitudes_gestion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    formulario_id UUID NOT NULL REFERENCES public.formularios_gestion(id) ON DELETE CASCADE,
    
    -- Datos de cada fila de solicitud
    elemento VARCHAR(200),
    unidad VARCHAR(100),
    categoria VARCHAR(100),
    sector VARCHAR(100),
    cantidad INTEGER DEFAULT 0,
    
    -- Orden dentro del formulario
    orden INTEGER DEFAULT 1,
    
    -- Metadatos
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA PARA CATÁLOGOS/OPCIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.catalogo_gestion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL, -- 'elemento', 'unidad', 'categoria', 'sector', 'tipo_gestion'
    codigo VARCHAR(50),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 1,
    
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
-- Formularios
CREATE INDEX IF NOT EXISTS idx_formularios_gestion_numero ON public.formularios_gestion(numero_formulario);
CREATE INDEX IF NOT EXISTS idx_formularios_gestion_fecha ON public.formularios_gestion(fecha_necesidad);
CREATE INDEX IF NOT EXISTS idx_formularios_gestion_estado ON public.formularios_gestion(estado);
CREATE INDEX IF NOT EXISTS idx_formularios_gestion_militante ON public.formularios_gestion(militante_id);
CREATE INDEX IF NOT EXISTS idx_formularios_gestion_coordinador ON public.formularios_gestion(coordinador_id);

-- Solicitudes
CREATE INDEX IF NOT EXISTS idx_solicitudes_gestion_formulario ON public.solicitudes_gestion(formulario_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_gestion_orden ON public.solicitudes_gestion(formulario_id, orden);

-- Catálogo
CREATE INDEX IF NOT EXISTS idx_catalogo_gestion_tipo ON public.catalogo_gestion(tipo, activo);

-- 5. TRIGGERS PARA ACTUALIZAR TIMESTAMPS
-- =====================================================
CREATE OR REPLACE FUNCTION public.actualizar_timestamp_formularios()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_formularios_gestion
    BEFORE UPDATE ON public.formularios_gestion
    FOR EACH ROW
    EXECUTE FUNCTION public.actualizar_timestamp_formularios();

-- 6. VISTA COMPLETA DE GESTIÓN GERENCIAL
-- =====================================================
CREATE OR REPLACE VIEW public.v_formularios_gestion_completa AS
SELECT 
    fg.id,
    fg.numero_formulario,
    fg.fecha_necesidad,
    fg.prioridad,
    fg.telefono,
    fg.localidad,
    fg.receptor,
    fg.estado_difusion,
    fg.limpio_conteo,
    fg.limpio_pendiente,
    fg.codigo_lider,
    fg.tipo_gestion,
    fg.gestor_asignado,
    fg.detalle_solicitud,
    fg.autorizacion_total,
    fg.fecha_entrega,
    fg.observaciones_prioridad,
    fg.observaciones_generales,
    fg.estado,
    fg.creado_en,
    fg.actualizado_en,
    
    -- IDs originales
    fg.militante_id,
    fg.coordinador_id,
    fg.dirigente_id,
    
    -- Información del Militante
    CONCAT(u_mil.nombres, ' ', u_mil.apellidos) as militante_nombre,
    u_mil.numero_documento as militante_documento,
    u_mil.email as militante_email,
    
    -- Información del Coordinador
    CONCAT(u_coord.nombres, ' ', u_coord.apellidos) as coordinador_nombre,
    u_coord.email as coordinador_email,
    coord.tipo as coordinador_tipo,
    
    -- Información del Dirigente
    CONCAT(u_dir.nombres, ' ', u_dir.apellidos) as dirigente_nombre,
    u_dir.email as dirigente_email,
    p_dir.nombre as dirigente_perfil_nombre,
    
    -- Información de quien creó
    CONCAT(u_creador.nombres, ' ', u_creador.apellidos) as creado_por_nombre,
    
    -- Información de quien aprobó
    CONCAT(u_aprobador.nombres, ' ', u_aprobador.apellidos) as aprobado_por_nombre
    
FROM public.formularios_gestion fg
    
-- JOIN con Militante
LEFT JOIN public.militantes m ON fg.militante_id = m.id
LEFT JOIN public.usuarios u_mil ON m.usuario_id = u_mil.id

-- JOIN con Coordinador
LEFT JOIN public.coordinadores coord ON fg.coordinador_id = coord.id
LEFT JOIN public.usuarios u_coord ON coord.usuario_id = u_coord.id

-- JOIN con Dirigente
LEFT JOIN public.coordinadores dirigente ON fg.dirigente_id = dirigente.id
LEFT JOIN public.usuarios u_dir ON dirigente.usuario_id = u_dir.id
LEFT JOIN public.perfiles p_dir ON dirigente.perfil_id = p_dir.id 
    AND p_dir.nombre ILIKE '%dirigente%'

-- JOIN con creador
LEFT JOIN auth.users au_creador ON fg.creado_por = au_creador.id
LEFT JOIN public.usuarios u_creador ON au_creador.email = u_creador.email

-- JOIN con aprobador
LEFT JOIN auth.users au_aprobador ON fg.aprobado_por = au_aprobador.id
LEFT JOIN public.usuarios u_aprobador ON au_aprobador.email = u_aprobador.email

ORDER BY fg.creado_en DESC;

-- 7. VISTA PARA FORMULARIOS CON SUS SOLICITUDES (SIMPLIFICADA)
-- =====================================================
CREATE OR REPLACE VIEW public.v_formularios_con_solicitudes AS
SELECT 
    fg.id,
    fg.numero_formulario,
    fg.fecha_necesidad,
    fg.prioridad,
    fg.estado,
    fg.creado_en,
    
    -- Agregaciones de las solicitudes
    COUNT(sg.id) as total_solicitudes,
    COALESCE(SUM(sg.cantidad), 0) as total_cantidad_items,
    
    -- Array de solicitudes (PostgreSQL JSON)
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', sg.id,
                'elemento', sg.elemento,
                'unidad', sg.unidad,
                'categoria', sg.categoria,
                'sector', sg.sector,
                'cantidad', sg.cantidad,
                'orden', sg.orden
            ) ORDER BY sg.orden
        ) FILTER (WHERE sg.id IS NOT NULL),
        '[]'::json
    ) as solicitudes_detalle
    
FROM public.formularios_gestion fg
LEFT JOIN public.solicitudes_gestion sg ON fg.id = sg.formulario_id

GROUP BY fg.id, fg.numero_formulario, fg.fecha_necesidad, fg.prioridad, fg.estado, fg.creado_en
ORDER BY fg.creado_en DESC;

-- 8. HABILITAR ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.formularios_gestion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_gestion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_gestion ENABLE ROW LEVEL SECURITY;

-- Políticas para formularios_gestion
CREATE POLICY "formularios_gestion_select_policy" ON public.formularios_gestion
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "formularios_gestion_insert_policy" ON public.formularios_gestion
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "formularios_gestion_update_policy" ON public.formularios_gestion
    FOR UPDATE USING (
        auth.uid() = creado_por 
        OR EXISTS (SELECT 1 FROM public.coordinadores c WHERE c.auth_user_id = auth.uid())
    );

-- Políticas para solicitudes_gestion
CREATE POLICY "solicitudes_gestion_select_policy" ON public.solicitudes_gestion
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "solicitudes_gestion_insert_policy" ON public.solicitudes_gestion
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "solicitudes_gestion_update_policy" ON public.solicitudes_gestion
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.formularios_gestion fg 
            WHERE fg.id = formulario_id 
            AND (fg.creado_por = auth.uid() OR EXISTS (SELECT 1 FROM public.coordinadores c WHERE c.auth_user_id = auth.uid()))
        )
    );

-- Políticas para catálogo
CREATE POLICY "catalogo_gestion_select_policy" ON public.catalogo_gestion
    FOR SELECT USING (auth.role() = 'authenticated');

-- 9. PERMISOS PARA LAS VISTAS
-- =====================================================
GRANT SELECT ON public.v_formularios_gestion_completa TO authenticated;
GRANT SELECT ON public.v_formularios_con_solicitudes TO authenticated;
GRANT SELECT ON public.v_formularios_gestion_completa TO anon;
GRANT SELECT ON public.v_formularios_con_solicitudes TO anon;

-- 10. FUNCIONES AUXILIARES
-- =====================================================
CREATE OR REPLACE FUNCTION public.obtener_opciones_catalogo(tipo_param VARCHAR)
RETURNS TABLE (
    id UUID,
    codigo VARCHAR,
    nombre VARCHAR,
    descripcion TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.codigo,
        c.nombre,
        c.descripcion
    FROM public.catalogo_gestion c
    WHERE c.tipo = tipo_param AND c.activo = true
    ORDER BY c.orden, c.nombre;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener dirigentes (coordinadores con perfil dirigente)
CREATE OR REPLACE FUNCTION public.obtener_dirigentes()
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    email VARCHAR,
    perfil_nombre VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        CONCAT(u.nombres, ' ', u.apellidos) as nombre,
        u.email,
        p.nombre as perfil_nombre
    FROM public.coordinadores c
    JOIN public.usuarios u ON c.usuario_id = u.id
    JOIN public.perfiles p ON c.perfil_id = p.id
    WHERE p.nombre = 'Dirigente' AND c.estado = 'activo'
    ORDER BY u.nombres, u.apellidos;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener coordinadores activos
CREATE OR REPLACE FUNCTION public.obtener_coordinadores_activos()
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    email VARCHAR,
    tipo VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        CONCAT(u.nombres, ' ', u.apellidos) as nombre,
        u.email,
        c.tipo
    FROM public.coordinadores c
    JOIN public.usuarios u ON c.usuario_id = u.id
    WHERE c.estado = 'activo'
    ORDER BY u.nombres, u.apellidos;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener militantes activos
CREATE OR REPLACE FUNCTION public.obtener_militantes_activos()
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    documento VARCHAR,
    email VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        CONCAT(u.nombres, ' ', u.apellidos) as nombre,
        u.numero_documento,
        u.email
    FROM public.militantes m
    JOIN public.usuarios u ON m.usuario_id = u.id
    WHERE m.estado = 'activo'
    ORDER BY u.nombres, u.apellidos;
END;
$$ LANGUAGE plpgsql;

-- 11. INSERTAR DATOS INICIALES DEL CATÁLOGO
-- =====================================================
INSERT INTO public.catalogo_gestion (tipo, codigo, nombre, orden) VALUES
-- Elementos
('elemento', 'ELEM001', 'Computadora', 1),
('elemento', 'ELEM002', 'Impresora', 2),
('elemento', 'ELEM003', 'Teléfono', 3),
('elemento', 'ELEM004', 'Mobiliario', 4),
('elemento', 'ELEM005', 'Material de Oficina', 5),

-- Unidades
('unidad', 'UNID001', 'Unidades', 1),
('unidad', 'UNID002', 'Cajas', 2),
('unidad', 'UNID003', 'Paquetes', 3),
('unidad', 'UNID004', 'Resmas', 4),
('unidad', 'UNID005', 'Metros', 5),

-- Categorías
('categoria', 'CAT001', 'Tecnología', 1),
('categoria', 'CAT002', 'Oficina', 2),
('categoria', 'CAT003', 'Logística', 3),
('categoria', 'CAT004', 'Recursos Humanos', 4),
('categoria', 'CAT005', 'Financiero', 5),

-- Sectores
('sector', 'SECT001', 'Administración', 1),
('sector', 'SECT002', 'Operaciones', 2),
('sector', 'SECT003', 'Coordinación', 3),
('sector', 'SECT004', 'Gestión', 4),
('sector', 'SECT005', 'Dirección', 5),

-- Tipos de Gestión
('tipo_gestion', 'TG001', 'Solicitud de Recursos', 1),
('tipo_gestion', 'TG002', 'Autorización de Gastos', 2),
('tipo_gestion', 'TG003', 'Seguimiento de Proyectos', 3),
('tipo_gestion', 'TG004', 'Control de Calidad', 4),
('tipo_gestion', 'TG005', 'Revisión Gerencial', 5)

ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================
COMMENT ON TABLE public.formularios_gestion IS 'Tabla principal para formularios de gestión gerencial';
COMMENT ON TABLE public.solicitudes_gestion IS 'Detalle de solicitudes por cada formulario (tabla dinámica)';
COMMENT ON TABLE public.catalogo_gestion IS 'Catálogo de opciones para elementos, unidades, categorías, etc.';

-- =====================================================
-- MODELO COMPLETO ✅
-- =====================================================
-- Este modelo incluye:
-- ✅ Tabla principal de formularios con todos los campos
-- ✅ Tabla detalle para solicitudes dinámicas (filas de la tabla)
-- ✅ Tabla catálogo para opciones de selección
-- ✅ Vistas con JOINs completos y agregaciones
-- ✅ RLS y permisos configurados
-- ✅ Datos iniciales del catálogo
-- ✅ Funciones helper para el frontend