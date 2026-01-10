# Guía de Configuración de Variables de Entorno

## Variables Requeridas

Para que la aplicación funcione correctamente, necesitas tener estas variables en tu archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

## ⚠️ IMPORTANTE

1. **SUPABASE_SERVICE_ROLE_KEY NO debe tener el prefijo `NEXT_PUBLIC_`**
   - Es una clave secreta que solo debe estar disponible en el servidor
   - Si le pones `NEXT_PUBLIC_`, se expondrá al cliente (¡muy peligroso!)

2. **Ubicación del archivo**
   - El archivo debe llamarse `.env.local` (con el punto al inicio)
   - Debe estar en la raíz del proyecto (mismo nivel que `package.json`)

3. **Reiniciar el servidor**
   - Después de agregar o modificar variables de entorno, **DEBES reiniciar el servidor de desarrollo**
   - Detén el servidor (Ctrl+C) y vuelve a ejecutar `npm run dev`

## Cómo encontrar tus claves de Supabase

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Ahí encontrarás:
   - **Project URL** → Usa esto para `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Usa esto para `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → Usa esto para `SUPABASE_SERVICE_ROLE_KEY` (⚠️ SECRETO)

## Verificación

Después de configurar las variables y reiniciar el servidor, deberías ver en la consola del servidor (no del navegador):

```
🔍 Debug - Variables de entorno disponibles:
  NEXT_PUBLIC_SUPABASE_URL: ✅ definida
  SUPABASE_SERVICE_ROLE_KEY: ✅ definida
```

Si ves `❌ no definida`, verifica:
1. Que el archivo se llame exactamente `.env.local` (con el punto)
2. Que esté en la raíz del proyecto
3. Que no haya espacios extra alrededor del `=`
4. Que hayas reiniciado el servidor después de agregar la variable

## Ejemplo de archivo .env.local

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2ODAwMCwiZXhwIjoxOTU0NTQ0MDAwfQ.example
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM4OTY4MDAwLCJleHAiOjE5NTQ1NDQwMDB9.example
```

**Nota:** Los valores de ejemplo son ficticios. Usa tus propias claves de Supabase.

