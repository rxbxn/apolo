-- Permisos de módulo POR USUARIO (independientes del rol/perfil).
--
-- Hasta ahora el acceso a módulos se decidía solo por perfil
-- (perfil_permiso_modulo): todos los usuarios con el mismo perfil ven
-- exactamente los mismos módulos. Esta tabla permite darle a un usuario
-- puntual acceso a módulos ADICIONALES a los que ya le da su perfil, sin
-- tener que crear un perfil nuevo solo para él.
--
-- El acceso final de un usuario a un módulo es la UNIÓN de:
--   1) lo que le da perfil_permiso_modulo según su perfil activo, y
--   2) lo que tenga puntualmente en usuario_permiso_modulo.
-- No es un reemplazo/override — solo suma.

CREATE TABLE IF NOT EXISTS usuario_permiso_modulo (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    modulo_id   UUID NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    permiso_id  UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE (usuario_id, modulo_id, permiso_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_permiso_modulo_usuario_id
    ON usuario_permiso_modulo(usuario_id);

-- RLS: mismo criterio que perfil_permiso_modulo (lectura para
-- autenticados; solo el backend con service role escribe, vía
-- /api/roles/permisos-usuario).
ALTER TABLE usuario_permiso_modulo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario_permiso_modulo_select_authenticated" ON usuario_permiso_modulo;
CREATE POLICY "usuario_permiso_modulo_select_authenticated"
    ON usuario_permiso_modulo FOR SELECT
    TO authenticated
    USING (true);
