# Solución: Error de Recursión Infinita en RLS

## Problema

El error `infinite recursion detected in policy for relation "usuarios"` ocurre porque las políticas RLS intentan verificar permisos consultando la misma tabla `usuarios` que están protegiendo, creando un ciclo infinito.

## Solución

El script `crear-super-admin.sql` ha sido actualizado para:

1. ✅ **Deshabilitar RLS temporalmente** en la tabla `usuarios`
2. ✅ **Insertar el super admin** sin restricciones
3. ✅ **Eliminar políticas problemáticas** con recursión
4. ✅ **Crear políticas simplificadas** sin recursión
5. ✅ **Re-habilitar RLS** con políticas corregidas

## Políticas RLS Corregidas

Las nuevas políticas son más simples y no causan recursión:

### Para SELECT (Ver datos)
- ✅ Los usuarios pueden ver su propia información
- ✅ Usuarios autenticados pueden ver todos los usuarios

### Para INSERT (Crear)
- ✅ Usuarios autenticados pueden crear usuarios

### Para UPDATE (Actualizar)
- ✅ Los usuarios pueden actualizar su propia información
- ✅ Usuarios autenticados pueden actualizar cualquier usuario (para admins)

## Cómo ejecutar

1. Ve a Supabase → SQL Editor
2. Copia **TODO** el contenido de `crear-super-admin.sql`
3. Pega y ejecuta (Run)
4. Verifica los resultados al final

## Qué esperar

El script mostrará al final:
- ✅ Datos del usuario creado
- ✅ Total de permisos asignados
- ✅ Lista de módulos con permisos

## Después de ejecutar

Podrás iniciar sesión en:
- URL: `http://localhost:3000/login`
- Email: `araujocarpio@gmail.com`
- Password: (la que configuraste en Supabase Auth)

## Nota importante

Las políticas RLS ahora son más permisivas para usuarios autenticados. Esto es intencional para permitir que los administradores gestionen usuarios. La lógica de permisos granular se maneja en el código de la aplicación, no en RLS.

Si necesitas políticas más restrictivas más adelante, podemos implementarlas usando funciones de PostgreSQL que no causen recursión.
