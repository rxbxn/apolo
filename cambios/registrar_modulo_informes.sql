-- Registra "Informes" en la tabla modulos para que aparezca en
-- Gestión de Roles > Permisos por rol (y por usuario), igual que los
-- demás módulos. El sidebar ya lo muestra por defecto a todos los roles
-- sin restricción explícita configurada — esto solo habilita poder
-- restringirlo/otorgarlo puntualmente si el equipo lo necesita.
INSERT INTO modulos (nombre, ruta, icono, orden)
SELECT 'Informes', '/dashboard/informes', 'chart-bar', (SELECT COALESCE(MAX(orden), 0) + 1 FROM modulos)
WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE ruta = '/dashboard/informes');

-- Verificación
SELECT id, nombre, ruta, icono, orden FROM modulos WHERE ruta = '/dashboard/informes';
