# Plan de Implementación - Integración Frontend

## 🎯 Objetivo
Integrar completamente el frontend de APOLO con las tablas de Supabase ya creadas, implementando el sistema de usuarios, perfiles y permisos.

---

## 📋 Orden de Ejecución

### FASE 1: Hooks y Utilidades Base (30 min)
**Archivos a crear:**
1. `lib/hooks/use-usuario.ts` - Hook para usuario actual
2. `lib/hooks/use-permisos.ts` - Hook para verificar permisos
3. `lib/hooks/use-catalogos.ts` - Hook para catálogos (ciudades, zonas, etc.)
4. `lib/contexts/auth-context.tsx` - Contexto de autenticación
5. `lib/hooks/use-personas.ts` - Hook para CRUD de personas

**Dependencias:** Ninguna
**Prioridad:** ALTA

---

### FASE 2: Autenticación (20 min)
**Archivos a crear:**
1. `app/login/page.tsx` - Página de login
2. `components/auth/login-form.tsx` - Formulario de login
3. `middleware.ts` - Middleware de autenticación
4. `components/auth/protected-route.tsx` - HOC para rutas protegidas

**Dependencias:** FASE 1
**Prioridad:** ALTA

---

### FASE 3: Módulo de Personas - Listado (45 min)
**Archivos a crear:**
1. `app/dashboard/personas/page.tsx` - Página principal
2. `components/personas/persona-table.tsx` - Tabla de personas
3. `components/personas/persona-filters.tsx` - Filtros
4. `components/personas/persona-actions.tsx` - Acciones (editar, eliminar)
5. `components/ui/data-table.tsx` - Componente reutilizable de tabla

**Dependencias:** FASE 1, FASE 2
**Prioridad:** ALTA

---

### FASE 4: Módulo de Personas - Formulario (60 min)
**Archivos a crear:**
1. `app/dashboard/personas/nuevo/page.tsx` - Crear persona
2. `app/dashboard/personas/[id]/page.tsx` - Editar persona
3. `components/personas/persona-form.tsx` - Formulario completo
4. `components/personas/form-sections/datos-personales.tsx`
5. `components/personas/form-sections/ubicacion.tsx`
6. `components/personas/form-sections/contacto.tsx`
7. `components/personas/form-sections/datos-demograficos.tsx`
8. `components/personas/form-sections/redes-sociales.tsx`
9. `components/personas/form-sections/referencias.tsx`
10. `components/personas/form-sections/compromisos.tsx`

**Dependencias:** FASE 1, FASE 3
**Prioridad:** ALTA

---

### FASE 5: Módulo de Administración - Perfiles (40 min)
**Archivos a crear:**
1. `app/dashboard/admin/perfiles/page.tsx` - Gestión de perfiles
2. `components/admin/perfil-card.tsx` - Tarjeta de perfil
3. `components/admin/asignar-perfil-dialog.tsx` - Dialog para asignar perfiles
4. `components/admin/usuarios-por-perfil.tsx` - Lista de usuarios por perfil

**Dependencias:** FASE 1, FASE 2
**Prioridad:** MEDIA

---

### FASE 6: Módulo de Administración - Permisos (50 min)
**Archivos a crear:**
1. `app/dashboard/admin/permisos/page.tsx` - Matriz de permisos
2. `components/admin/permisos-matrix.tsx` - Matriz interactiva
3. `components/admin/permiso-cell.tsx` - Celda de permiso
4. `components/admin/modulo-header.tsx` - Header de módulo

**Dependencias:** FASE 5
**Prioridad:** MEDIA

---

### FASE 7: Integración con Dashboard Existente (30 min)
**Archivos a modificar:**
1. `components/dashboard/sidebar.tsx` - Cargar módulos dinámicamente
2. `components/dashboard/modules-grid.tsx` - Filtrar por permisos
3. `app/dashboard/layout.tsx` - Agregar AuthProvider
4. `app/dashboard/page.tsx` - Mostrar info del usuario

**Dependencias:** FASE 1, FASE 2
**Prioridad:** ALTA

---

### FASE 8: Componentes UI Reutilizables (20 min)
**Archivos a crear:**
1. `components/ui/loading-skeleton.tsx` - Skeleton loader
2. `components/ui/empty-state.tsx` - Estado vacío
3. `components/ui/error-boundary.tsx` - Manejo de errores
4. `components/ui/confirmation-dialog.tsx` - Dialog de confirmación

**Dependencias:** Ninguna
**Prioridad:** BAJA

---

## 🚀 Orden de Ejecución Recomendado

```
1. FASE 1 (Hooks y Utilidades) ✓ Comenzar aquí
2. FASE 2 (Autenticación)
3. FASE 7 (Integración Dashboard) - Para ver resultados rápido
4. FASE 3 (Personas - Listado)
5. FASE 4 (Personas - Formulario)
6. FASE 5 (Admin - Perfiles)
7. FASE 6 (Admin - Permisos)
8. FASE 8 (Componentes UI)
```

---

## 📊 Estimación de Tiempo

| Fase | Tiempo Estimado | Prioridad |
|------|----------------|-----------|
| FASE 1 | 30 min | ALTA |
| FASE 2 | 20 min | ALTA |
| FASE 3 | 45 min | ALTA |
| FASE 4 | 60 min | ALTA |
| FASE 5 | 40 min | MEDIA |
| FASE 6 | 50 min | MEDIA |
| FASE 7 | 30 min | ALTA |
| FASE 8 | 20 min | BAJA |
| **TOTAL** | **~5 horas** | |

---

## 🔧 Tecnologías y Librerías

- **Supabase** - Base de datos y autenticación
- **React Hook Form** - Manejo de formularios
- **Zod** - Validación de esquemas
- **Radix UI** - Componentes UI (ya instalado)
- **Lucide React** - Iconos (ya instalado)
- **Sonner** - Notificaciones toast (ya instalado)

---

## ✅ Checklist de Verificación

Antes de comenzar, verificar:
- [x] Script SQL ejecutado en Supabase
- [x] Variables de entorno configuradas (.env.local)
- [x] Supabase instalado (`@supabase/supabase-js`)
- [x] Cliente de Supabase configurado
- [x] Tipos TypeScript generados

---

## 🎯 Comenzar Implementación

**Siguiente paso:** Crear hooks y utilidades base (FASE 1)

¿Listo para comenzar?
