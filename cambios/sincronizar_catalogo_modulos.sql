-- ============================================================
--  Sincronizar tabla `modulos` con los módulos reales del código
--  (web sidebar + APK), para que Gestión de Roles > Permisos por
--  rol pueda listar y restringir TODOS los módulos que existen.
-- ============================================================
--
-- Auditoría (2026-07-21): 4 módulos del sidebar web no tenían fila en
-- `modulos`, así que nunca podían aparecer en la matriz de permisos para
-- otorgarlos/restringirlos a un rol: Fotos Masivas, Visitas y Reuniones,
-- Módulo Dirigente, Gestión de Roles. Además 2 módulos existentes tenían la
-- `ruta` desactualizada (no coincide con la ruta real del sidebar), por lo
-- que cualquier permiso configurado sobre ellos nunca hacía match.
--
-- Todo idempotente: correr las veces que haga falta sin duplicar ni pisar
-- datos.

-- 1) Módulos que faltaban por completo -------------------------------
--
-- `modulos.nombre` tiene constraint UNIQUE (modulos_nombre_key). Ya existían
-- filas con nombre "Visitas y Reuniones" (y posiblemente otras) creadas en
-- algún momento con una ruta distinta a la real del sidebar — el INSERT
-- directo chocaba con esa constraint. Ahora cada módulo primero intenta
-- UPDATE por nombre (corrige la ruta si la fila ya existe con otra ruta) y
-- solo hace INSERT si de verdad no existe ni por nombre ni por ruta.

UPDATE modulos SET ruta = '/dashboard/fotos-masivas' WHERE nombre = 'Fotos Masivas' AND ruta <> '/dashboard/fotos-masivas';
INSERT INTO modulos (nombre, ruta, icono, orden)
SELECT 'Fotos Masivas', '/dashboard/fotos-masivas', 'image', (SELECT COALESCE(MAX(orden), 0) + 1 FROM modulos)
WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Fotos Masivas')
  AND NOT EXISTS (SELECT 1 FROM modulos WHERE ruta  = '/dashboard/fotos-masivas');

UPDATE modulos SET ruta = '/dashboard/visitas-reuniones' WHERE nombre = 'Visitas y Reuniones' AND ruta <> '/dashboard/visitas-reuniones';
INSERT INTO modulos (nombre, ruta, icono, orden)
SELECT 'Visitas y Reuniones', '/dashboard/visitas-reuniones', 'map-pin', (SELECT COALESCE(MAX(orden), 0) + 1 FROM modulos)
WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Visitas y Reuniones')
  AND NOT EXISTS (SELECT 1 FROM modulos WHERE ruta  = '/dashboard/visitas-reuniones');

UPDATE modulos SET ruta = '/dashboard/dirigente' WHERE nombre = 'Módulo Dirigente' AND ruta <> '/dashboard/dirigente';
INSERT INTO modulos (nombre, ruta, icono, orden)
SELECT 'Módulo Dirigente', '/dashboard/dirigente', 'user-check', (SELECT COALESCE(MAX(orden), 0) + 1 FROM modulos)
WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Módulo Dirigente')
  AND NOT EXISTS (SELECT 1 FROM modulos WHERE ruta  = '/dashboard/dirigente');

UPDATE modulos SET ruta = '/dashboard/roles' WHERE nombre = 'Gestión de Roles' AND ruta <> '/dashboard/roles';
INSERT INTO modulos (nombre, ruta, icono, orden)
SELECT 'Gestión de Roles', '/dashboard/roles', 'shield', (SELECT COALESCE(MAX(orden), 0) + 1 FROM modulos)
WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE nombre = 'Gestión de Roles')
  AND NOT EXISTS (SELECT 1 FROM modulos WHERE ruta  = '/dashboard/roles');

-- 2) Rutas desactualizadas: se actualiza el valor en la fila existente
--    (conserva el mismo id, así que cualquier permiso ya asignado sobre
--    este módulo se mantiene intacto, solo empieza a hacer match real).

UPDATE modulos SET ruta = '/dashboard/activities'
WHERE ruta = '/dashboard/actividades'
  AND NOT EXISTS (SELECT 1 FROM modulos WHERE ruta = '/dashboard/activities');

UPDATE modulos SET ruta = '/dashboard/assign-data'
WHERE ruta = '/dashboard/asignar-datos'
  AND NOT EXISTS (SELECT 1 FROM modulos WHERE ruta = '/dashboard/assign-data');

-- 3) Verificación — debe listar los 14 módulos del sidebar web con su ruta
--    real (más los módulos exclusivos de APK, ej. VerificacionStickers).
SELECT id, nombre, ruta, icono, orden, activo
FROM modulos
ORDER BY orden;

-- NOTA (no se toca en este script, revisar manualmente si aplica):
-- Existen 2 filas "huérfanas" heredadas del seed original que ya no
-- corresponden a ninguna página real: 'Gestión de Terreno' (ruta
-- /dashboard/terreno) y 'Administración' (ruta /dashboard/admin). Y
-- "Alistamiento Debate" tiene una fila vieja con ruta
-- /dashboard/alistamiento-debate además de la actual /dashboard/debate — se
-- dejaron ambas porque la APK ya las mapea a la misma pantalla por
-- compatibilidad. Si algún rol tiene permisos asignados sobre las huérfanas,
-- verificarlo antes de desactivarlas.
