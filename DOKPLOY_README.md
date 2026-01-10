# 🚀 Deployment en Dokploy - APOLO CRM

## ⚠️ PROBLEMA IDENTIFICADO: Variables de Entorno Faltantes

El error en el build es: **"Missing Supabase environment variables"**

## 🔧 SOLUCIÓN PASO A PASO:

### 1. Configurar Variables en Dokploy:
En tu panel de Dokploy, ve a **Environment Variables** y agrega:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://apolo-supabase-5789c7-72-61-64-225.traefik.me
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjQxODY5MzksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.wlVt8TqPbwpxniBHoOzVtFVPIJ0yPlkyyg1Iz7Xq0l8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjQxODY5MzksImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.gmq1I4uMK3Okk5jJVFCRM6Y_XEgT41sURS7H8KZbtQE
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1
```

### 2. Configurar Build Arguments (si está disponible):
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### 3. Configuración del Proyecto en Dokploy:
- **Tipo**: Dockerfile
- **Puerto**: 3000 (cambiado de 8080)
- **Health Check**: `/api/health`

### 4. Hacer Commit y Push:
```bash
git add .
git commit -m "Fix: Configure environment variables for production build"
git push origin main
```

## 🛠️ Cambios Realizados:

✅ **Dockerfile actualizado** - Ahora acepta variables de entorno como build args
✅ **Puerto cambiado a 3000** - Estándar de Next.js
✅ **Cliente Supabase mejorado** - Maneja variables faltantes durante build
✅ **next.config.mjs optimizado** - Configuración para variables de entorno
✅ **dokploy.json actualizado** - Configuración correcta para puerto 3000

## 🎯 Próximos Pasos:

1. **Configura las variables de entorno** en Dokploy como se muestra arriba
2. **Haz push de los cambios** (ya están listos)
3. **Redespliega** la aplicación en Dokploy
4. **Verifica** el health check en: `https://tu-dominio.com/api/health`

## ⚡ Health Check:
- **Endpoint**: `/api/health`
- **Puerto**: 3000
- **Respuesta esperada**: `{"status": "ok", "timestamp": "..."}`

Una vez desplegado, puedes verificar:

```bash
# Health check
curl http://tu-dominio.com/health

# Respuesta esperada:
{
  "status": "OK",
  "timestamp": "2026-01-07T...",
  "uptime": 123.45,
  "environment": "production",
  "port": "8080",
  "version": "1.0.0",
  "memory": {
    "used": 45.67,
    "total": 128.0,
    "percentage": 35
  }
}
```

## 📁 Archivos importantes para Dokploy
- `Dockerfile` - Configurado para puerto 8080
- `start.sh` - Script de inicio optimizado
- `docker-compose.yml` - Configuración de contenedor
- `dokploy.json` - Configuración específica de Dokploy
- `.env.production` - Variables de entorno de producción
- `app/api/health/route.ts` - Endpoint de health check