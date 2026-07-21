-- Soporta el nuevo flujo "Crear Usuario (sin correo)" en Gestión de Roles:
-- un usuario puede iniciar sesión con un `username` en vez de un correo real
-- (por debajo se le crea un correo interno sintético username@apolo.interno
-- en Supabase Auth, que nunca se le muestra). `password` guarda la
-- contraseña en texto plano para poder mostrarla/compartirla desde el admin
-- — mismo criterio ya usado en coordinadores.password.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password TEXT;

-- Módulo "Verificación de Stickers" en la APK. La pantalla y su ruta
-- ('VerificacionStickers') ya existen en el código de la APK — este INSERT
-- solo asegura que exista la fila en `modulos` para poder restringir el
-- acceso por rol (ej. el nuevo perfil "Verificador de Sticker" solo debe
-- ver esta tarjeta al entrar). Es idempotente: si ya existe, no hace nada.
INSERT INTO modulos (nombre, ruta, icono, orden)
SELECT 'Verificación de Stickers', 'VerificacionStickers', 'check-circle', (SELECT COALESCE(MAX(orden), 0) + 1 FROM modulos)
WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE ruta = 'VerificacionStickers');

-- Verificación
SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name IN ('username', 'password');
SELECT id, nombre, ruta, icono, orden FROM modulos WHERE ruta = 'VerificacionStickers';
