-- BUG REAL encontrado: coordinadores.perfil_id se guarda bien (por eso el
-- diagnóstico anterior mostró "Coordinador de Zona" con 25 módulos), pero
-- obtenerModulosUsuario (web y APK) consulta PRIMERO la tabla usuario_perfil
-- y solo cae al perfil de `coordinadores` si esa tabla no tiene ninguna fila
-- activa para el usuario. Si el usuario ya tenía una fila vieja ahí (por
-- ejemplo de cuando era un Militante normal, antes de convertirlo en
-- coordinador), esa fila vieja ganaba en silencio — por eso no le salía
-- ningún módulo, aunque coordinadores.perfil_id estuviera bien.
--
-- Ya corregí crear()/actualizar() en el código para que esto no vuelva a
-- pasar con coordinadores nuevos o al editar uno. Este script es solo para
-- arreglar retroactivamente los que ya quedaron mal.

-- 1) DIAGNÓSTICO: coordinadores cuyo perfil real (coordinadores.perfil_id)
-- no coincide con lo que tienen activo en usuario_perfil — estos son los
-- que están viendo módulos equivocados o ninguno.
SELECT
  c.email,
  c.usuario_id,
  perfil_coordinador.nombre AS perfil_segun_coordinadores,
  perfil_usuario_perfil.nombre AS perfil_segun_usuario_perfil,
  up.activo AS usuario_perfil_activo
FROM coordinadores c
LEFT JOIN perfiles perfil_coordinador ON perfil_coordinador.id = c.perfil_id
LEFT JOIN usuario_perfil up ON up.usuario_id = c.usuario_id AND up.activo = true
LEFT JOIN perfiles perfil_usuario_perfil ON perfil_usuario_perfil.id = up.perfil_id
WHERE c.estado = 'activo'
  AND c.perfil_id IS NOT NULL
  AND (up.perfil_id IS DISTINCT FROM c.perfil_id);

-- 2) FIX MASIVO: sincroniza usuario_perfil con coordinadores.perfil_id para
-- TODOS los coordinadores activos de una sola vez (desactiva cualquier otro
-- perfil activo que tuvieran y deja el de coordinadores.perfil_id como el
-- único activo/principal). Revisa el resultado del diagnóstico antes de
-- correr esto si quieres estar seguro de a quiénes afecta.
UPDATE usuario_perfil up
SET activo = false, fecha_revocacion = now()
FROM coordinadores c
WHERE up.usuario_id = c.usuario_id
  AND up.activo = true
  AND c.estado = 'activo'
  AND c.perfil_id IS NOT NULL
  AND up.perfil_id IS DISTINCT FROM c.perfil_id;

INSERT INTO usuario_perfil (usuario_id, perfil_id, es_principal, activo)
SELECT c.usuario_id, c.perfil_id, true, true
FROM coordinadores c
WHERE c.estado = 'activo'
  AND c.perfil_id IS NOT NULL
ON CONFLICT (usuario_id, perfil_id)
DO UPDATE SET activo = true, es_principal = true, fecha_revocacion = null;

-- 3) Verificación: no debería quedar ninguna fila (todos sincronizados).
SELECT
  c.email,
  perfil_coordinador.nombre AS perfil_segun_coordinadores,
  perfil_usuario_perfil.nombre AS perfil_segun_usuario_perfil
FROM coordinadores c
LEFT JOIN perfiles perfil_coordinador ON perfil_coordinador.id = c.perfil_id
LEFT JOIN usuario_perfil up ON up.usuario_id = c.usuario_id AND up.activo = true
LEFT JOIN perfiles perfil_usuario_perfil ON perfil_usuario_perfil.id = up.perfil_id
WHERE c.estado = 'activo'
  AND c.perfil_id IS NOT NULL
  AND (up.perfil_id IS DISTINCT FROM c.perfil_id);
