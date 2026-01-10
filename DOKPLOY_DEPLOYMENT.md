# 🚀 Deployment Guide - APOLO CRM en Dokploy

## 📋 Configuración Optimizada

### Puerto y Configuración
- **Puerto**: `3000` (estándar Next.js)
- **Health Check**: `/api/health`
- **Build**: Next.js Standalone optimizado
- **Cache**: Manejo automático de cache bust

### 🔧 Archivos Configurados

#### 1. **Dockerfile**
- Multi-stage build con Node.js 20 Alpine
- Standalone output para máximo rendimiento
- Health check integrado
- Usuario no-root para seguridad

#### 2. **dokploy.json**
- Puerto 3000 configurado
- Health check en `/api/health`
- Variables de entorno optimizadas
- Cache bust automático con BUILD_ID

#### 3. **.dockerignore**
- Archivos de desarrollo excluidos
- Optimización de build time
- Cache limpio

### 🚨 Solución de Problemas

#### Cache no se actualiza:
1. Ejecutar: `./force-deploy.sh`
2. O modificar `.cache-bust` manualmente
3. Commit y push los cambios

#### App no responde:
- Verificar puerto 3000 en Dokploy
- Revisar logs: `/api/health` debe responder 200
- Verificar variables de entorno

### 📝 Deployment Steps

1. **Commit cambios**:
   ```bash
   git add .
   git commit -m "feat: optimized deployment configuration"
   git push origin main
   ```

2. **En Dokploy**:
   - Configurar puerto: 3000
   - Health check: `/api/health`
   - Rebuild desde zero si hay problemas de cache

3. **Verificar**:
   - App responde en puerto 3000
   - Health check OK: `http://tu-dominio.com/api/health`

### ⚡ Performance

- **Build time**: ~2-3 minutos
- **Start time**: ~10-15 segundos
- **Memory usage**: ~150-200MB
- **Health check**: 30s interval

---
*Última actualización: 2026-01-09*