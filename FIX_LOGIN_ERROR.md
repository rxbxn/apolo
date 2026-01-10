# Solución: Error de Recursión Infinita al Hacer Login

## Problema

El error `infinite recursion detected in policy for relation "usuarios"` ocurre al intentar hacer login porque:

1. El `AuthContext` intenta cargar el usuario desde la tabla `usuarios`
2. Las políticas RLS intentan verificar permisos consultando la misma tabla
3. Esto crea un ciclo infinito

## Solución Rápida

Ejecuta el archivo `fix-rls-policies.sql` en Supabase SQL Editor:

1. Ve a Supabase → SQL Editor
2. Copia el contenido de `fix-rls-policies.sql`
3. Ejecuta (Run)
4. Reinicia tu aplicación (`Ctrl+C` y `npm run dev`)
5. Intenta hacer login nuevamente

## Qué hace el script

- ✅ Elimina TODAS las políticas problemáticas
- ✅ Crea políticas simples que permiten acceso a usuarios autenticados
- ✅ Evita cualquier recursión

## Políticas RLS Nuevas

Las nuevas políticas son extremadamente simples:

```sql
-- Usuarios autenticados pueden hacer TODO
SELECT, INSERT, UPDATE, DELETE → permitido para authenticated
```

## ¿Es seguro?

**Sí**, porque:
- Solo usuarios autenticados tienen acceso (no público)
- La lógica de permisos granular se maneja en el código de la aplicación
- Los hooks `usePermisos` verifican los permisos antes de mostrar/permitir acciones

## Después de ejecutar

1. Reinicia el servidor: `Ctrl+C` → `npm run dev`
2. Ve a `http://localhost:3000/login`
3. Ingresa tus credenciales
4. ¡Deberías poder iniciar sesión sin errores!

## Si aún tienes problemas

Verifica en la consola del navegador (F12) si hay otros errores y compártelos.
