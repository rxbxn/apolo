-- ============================================
-- TABLAS PRINCIPALES
-- ============================================

-- Tabla principal: Formato de Gestión y Compromisos
CREATE TABLE formato_gestion_compromisos (
    id BIGSERIAL PRIMARY KEY,
    numero_formulario VARCHAR(50),
    
    -- Información de personal
    militante VARCHAR(255),
    dirigente VARCHAR(255),
    coordinador VARCHAR(255),
    telefono VARCHAR(20),
    localidad VARCHAR(100),
    receptor VARCHAR(255),
    
    -- Estados y gestión
    estado_difusion BOOLEAN DEFAULT FALSE,
    limpio_count INT DEFAULT 0,
    limpio_pendiente INT DEFAULT 0,
    lider_codigo VARCHAR(50),
    tipo_gestion VARCHAR(50), -- 'GESTIÓN PRIVADA' u otro
    
    -- Gestor y solicitud
    gestor_asignado VARCHAR(255),
    solicitud TEXT,
    fecha_necesidad DATE,
    
    -- Campos de autorización y entrega
    autorizacion_total NUMERIC(15,2),
    entregas_fecha DATE,
    prioridad VARCHAR(50), -- '-- Seleccione --', 'Alta', 'Media', 'Baja'
    observaciones_prioridad TEXT,
    observaciones_generales TEXT,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Tabla dinámica: Solicitudes de Gestión (registros repetibles)
CREATE TABLE solicitudes_gestion (
    id BIGSERIAL PRIMARY KEY,
    formato_id BIGINT NOT NULL REFERENCES formato_gestion_compromisos(id) ON DELETE CASCADE,
    
    -- Campos del elemento repetible
    elemento VARCHAR(255),
    unidad VARCHAR(100),
    categoria VARCHAR(100),
    sector VARCHAR(100),
    cantidad NUMERIC(10,2),
    
    -- Orden para mantener secuencia
    orden INT,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejor performance
CREATE INDEX idx_formato_created_by ON formato_gestion_compromisos(created_by);
CREATE INDEX idx_formato_fecha_necesidad ON formato_gestion_compromisos(fecha_necesidad);
CREATE INDEX idx_formato_numero ON formato_gestion_compromisos(numero_formulario);
CREATE INDEX idx_solicitudes_formato_orden ON solicitudes_gestion(formato_id, orden);

-- ============================================
-- TRIGGER PARA ACTUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_formato_gestion_updated_at
    BEFORE UPDATE ON formato_gestion_compromisos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_solicitudes_gestion_updated_at
    BEFORE UPDATE ON solicitudes_gestion
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCIONES PARA OPERACIONES
-- ============================================

-- Función para insertar formato completo con solicitudes
CREATE OR REPLACE FUNCTION insert_formato_gestion(
    p_numero_formulario VARCHAR,
    p_militante VARCHAR,
    p_dirigente VARCHAR,
    p_coordinador VARCHAR,
    p_telefono VARCHAR,
    p_localidad VARCHAR,
    p_receptor VARCHAR,
    p_estado_difusion BOOLEAN,
    p_limpio_count INT,
    p_limpio_pendiente INT,
    p_lider_codigo VARCHAR,
    p_tipo_gestion VARCHAR,
    p_gestor_asignado VARCHAR,
    p_solicitud TEXT,
    p_fecha_necesidad DATE,
    p_autorizacion_total NUMERIC,
    p_entregas_fecha DATE,
    p_prioridad VARCHAR,
    p_observaciones_prioridad TEXT,
    p_observaciones_generales TEXT,
    p_solicitudes JSONB
)
RETURNS BIGINT AS $$
DECLARE
    v_formato_id BIGINT;
    v_solicitud JSONB;
BEGIN
    -- Insertar formato principal
    INSERT INTO formato_gestion_compromisos (
        numero_formulario, militante, dirigente, coordinador,
        telefono, localidad, receptor, estado_difusion,
        limpio_count, limpio_pendiente, lider_codigo, tipo_gestion,
        gestor_asignado, solicitud, fecha_necesidad,
        autorizacion_total, entregas_fecha, prioridad,
        observaciones_prioridad, observaciones_generales, created_by, updated_by
    ) VALUES (
        p_numero_formulario, p_militante, p_dirigente, p_coordinador,
        p_telefono, p_localidad, p_receptor, p_estado_difusion,
        p_limpio_count, p_limpio_pendiente, p_lider_codigo, p_tipo_gestion,
        p_gestor_asignado, p_solicitud, p_fecha_necesidad,
        p_autorizacion_total, p_entregas_fecha, p_prioridad,
        p_observaciones_prioridad, p_observaciones_generales, auth.uid(), auth.uid()
    )
    RETURNING id INTO v_formato_id;
    
    -- Insertar solicitudes si existen
    IF p_solicitudes IS NOT NULL THEN
        FOR v_solicitud IN SELECT * FROM jsonb_array_elements(p_solicitudes)
        LOOP
            INSERT INTO solicitudes_gestion (
                formato_id, elemento, unidad, categoria, sector, cantidad, orden
            ) VALUES (
                v_formato_id,
                v_solicitud->>'elemento',
                v_solicitud->>'unidad',
                v_solicitud->>'categoria',
                v_solicitud->>'sector',
                (v_solicitud->>'cantidad')::NUMERIC,
                (v_solicitud->>'orden')::INT
            );
        END LOOP;
    END IF;
    
    RETURN v_formato_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en las tablas
ALTER TABLE formato_gestion_compromisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_gestion ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS DE SEGURIDAD - formato_gestion_compromisos
-- ============================================

-- Política: Usuarios autenticados pueden ver todos los registros
CREATE POLICY "Usuarios autenticados pueden ver formatos"
    ON formato_gestion_compromisos
    FOR SELECT
    TO authenticated
    USING (true);

-- Política: Usuarios autenticados pueden insertar registros
CREATE POLICY "Usuarios autenticados pueden crear formatos"
    ON formato_gestion_compromisos
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Política: Usuarios pueden actualizar sus propios registros
CREATE POLICY "Usuarios pueden actualizar sus propios formatos"
    ON formato_gestion_compromisos
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Política: Usuarios pueden eliminar sus propios registros
CREATE POLICY "Usuarios pueden eliminar sus propios formatos"
    ON formato_gestion_compromisos
    FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- ============================================
-- POLÍTICAS DE SEGURIDAD - solicitudes_gestion
-- ============================================

-- Política: Usuarios autenticados pueden ver solicitudes de formatos que pueden ver
CREATE POLICY "Usuarios autenticados pueden ver solicitudes"
    ON solicitudes_gestion
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM formato_gestion_compromisos
            WHERE id = solicitudes_gestion.formato_id
        )
    );

-- Política: Usuarios pueden insertar solicitudes en sus propios formatos
CREATE POLICY "Usuarios pueden crear solicitudes en sus formatos"
    ON solicitudes_gestion
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM formato_gestion_compromisos
            WHERE id = solicitudes_gestion.formato_id
            AND created_by = auth.uid()
        )
    );

-- Política: Usuarios pueden actualizar solicitudes de sus propios formatos
CREATE POLICY "Usuarios pueden actualizar solicitudes de sus formatos"
    ON solicitudes_gestion
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM formato_gestion_compromisos
            WHERE id = solicitudes_gestion.formato_id
            AND created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM formato_gestion_compromisos
            WHERE id = solicitudes_gestion.formato_id
            AND created_by = auth.uid()
        )
    );

-- Política: Usuarios pueden eliminar solicitudes de sus propios formatos
CREATE POLICY "Usuarios pueden eliminar solicitudes de sus formatos"
    ON solicitudes_gestion
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM formato_gestion_compromisos
            WHERE id = solicitudes_gestion.formato_id
            AND created_by = auth.uid()
        )
    );

-- ============================================
-- POLÍTICAS ADICIONALES PARA ROLES (OPCIONAL)
-- ============================================

-- Si tienes un rol de administrador, puedes agregar estas políticas adicionales:

-- Crear tabla de roles (si no existe)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver su propio rol"
    ON user_roles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Función helper para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política: Administradores pueden ver todos los formatos
CREATE POLICY "Administradores pueden ver todos los formatos"
    ON formato_gestion_compromisos
    FOR SELECT
    TO authenticated
    USING (is_admin());

-- Política: Administradores pueden actualizar cualquier formato
CREATE POLICY "Administradores pueden actualizar cualquier formato"
    ON formato_gestion_compromisos
    FOR UPDATE
    TO authenticated
    USING (is_admin());

-- Política: Administradores pueden eliminar cualquier formato
CREATE POLICY "Administradores pueden eliminar cualquier formato"
    ON formato_gestion_compromisos
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- ============================================
-- VISTA PARA CONSULTAR FORMATOS COMPLETOS
-- ============================================

CREATE OR REPLACE VIEW vw_formato_gestion_completo AS
SELECT 
    fg.id,
    fg.numero_formulario,
    fg.militante,
    fg.dirigente,
    fg.coordinador,
    fg.telefono,
    fg.localidad,
    fg.receptor,
    fg.estado_difusion,
    fg.limpio_count,
    fg.limpio_pendiente,
    fg.lider_codigo,
    fg.tipo_gestion,
    fg.gestor_asignado,
    fg.solicitud,
    fg.fecha_necesidad,
    fg.autorizacion_total,
    fg.entregas_fecha,
    fg.prioridad,
    fg.observaciones_prioridad,
    fg.observaciones_generales,
    fg.created_at,
    fg.updated_at,
    fg.created_by,
    fg.updated_by,
    jsonb_agg(
        jsonb_build_object(
            'id', sg.id,
            'elemento', sg.elemento,
            'unidad', sg.unidad,
            'categoria', sg.categoria,
            'sector', sg.sector,
            'cantidad', sg.cantidad,
            'orden', sg.orden
        ) ORDER BY sg.orden
    ) FILTER (WHERE sg.id IS NOT NULL) as solicitudes
FROM formato_gestion_compromisos fg
LEFT JOIN solicitudes_gestion sg ON fg.id = sg.formato_id
GROUP BY fg.id;
