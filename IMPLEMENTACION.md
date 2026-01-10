# Guía de Implementación - Sistema de Usuarios y Permisos

## 📋 Pasos Completados

### ✅ 1. Script SQL Generado
- **Archivo:** `supabase-schema.sql`
- **Contenido:**
  - 14 tablas (7 principales + 7 catálogos)
  - Row Level Security (RLS) habilitado
  - Triggers para timestamps automáticos
  - Funciones de permisos (`tiene_permiso`, `obtener_permisos_usuario`)
  - Datos iniciales (perfiles, módulos, permisos, catálogos)

### ✅ 2. Supabase Instalado
- Paquete `@supabase/supabase-js` instalado
- Cliente configurado en `lib/supabase/client.ts`
- Tipos TypeScript generados en `lib/supabase/database.types.ts`
- Funciones de utilidad en `lib/supabase/permissions.ts`

---

## 🚀 Próximos Pasos

### Paso 1: Configurar Supabase

1. **Crear proyecto en Supabase:**
   - Ve a https://app.supabase.com
   - Crea un nuevo proyecto
   - Espera a que se inicialice

2. **Ejecutar el script SQL:**
   - En Supabase, ve a SQL Editor
   - Copia todo el contenido de `supabase-schema.sql`
   - Pégalo y ejecuta (Run)
   - Verifica que todas las tablas se crearon correctamente

3. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env.local
   ```
   - Edita `.env.local` con tus credenciales de Supabase
   - Obtén las claves desde Settings > API en Supabase

### Paso 2: Crear Módulo de Usuarios

Necesitamos crear las siguientes páginas y componentes:

#### A. Página de Listado de Usuarios
**Ruta:** `app/dashboard/personas/page.tsx`

Funcionalidades:
- Tabla con todos los usuarios
- Filtros por: estado, ciudad, zona, perfil
- Búsqueda por nombre/documento
- Botones de acción según permisos (crear, editar, eliminar)

#### B. Formulario de Creación/Edición
**Componente:** `components/personas/persona-form.tsx`

Campos (según el formulario de las imágenes):
- Información personal
- Ubicación (dropdowns de ciudad, localidad, barrio)
- Contacto
- Datos demográficos
- Redes sociales
- Referencias
- Compromisos

#### C. Gestión de Perfiles
**Ruta:** `app/dashboard/admin/perfiles/page.tsx`

Funcionalidades:
- Asignar/revocar perfiles a usuarios
- Configurar permisos por perfil
- Matriz de permisos (perfil × módulo × permiso)

---

## 📁 Estructura de Archivos Sugerida

```
app/
├── dashboard/
│   ├── personas/
│   │   ├── page.tsx              # Listado de personas
│   │   ├── [id]/
│   │   │   └── page.tsx          # Detalle/Edición de persona
│   │   └── nuevo/
│   │       └── page.tsx          # Crear nueva persona
│   └── admin/
│       ├── perfiles/
│       │   └── page.tsx          # Gestión de perfiles
│       └── permisos/
│           └── page.tsx          # Matriz de permisos

components/
├── personas/
│   ├── persona-form.tsx          # Formulario principal
│   ├── persona-table.tsx         # Tabla de personas
│   ├── persona-filters.tsx       # Filtros
│   └── persona-card.tsx          # Tarjeta de persona
├── perfiles/
│   ├── perfil-selector.tsx       # Selector de perfiles
│   └── permisos-matrix.tsx       # Matriz de permisos
└── auth/
    └── protected-route.tsx       # HOC para rutas protegidas

lib/
├── supabase/
│   ├── client.ts                 # ✅ Cliente Supabase
│   ├── database.types.ts         # ✅ Tipos TypeScript
│   └── permissions.ts            # ✅ Utilidades de permisos
└── hooks/
    ├── use-usuario.ts            # Hook para usuario actual
    ├── use-permisos.ts           # Hook para permisos
    └── use-personas.ts           # Hook para CRUD de personas
```

---

## 🔧 Ejemplo de Uso de Permisos

### En un Componente de Servidor

```typescript
// app/dashboard/personas/page.tsx
import { obtenerUsuarioActual, obtenerPermisosCRUD } from '@/lib/supabase/permissions'
import { redirect } from 'next/navigation'

export default async function PersonasPage() {
  const usuario = await obtenerUsuarioActual()
  
  if (!usuario) {
    redirect('/login')
  }

  const permisos = await obtenerPermisosCRUD(usuario.id, 'Módulo Personas')

  if (!permisos.leer) {
    return <div>No tienes permisos para ver esta página</div>
  }

  return (
    <div>
      <h1>Personas</h1>
      {permisos.crear && <Button>Crear Persona</Button>}
      {/* Resto del componente */}
    </div>
  )
}
```

### En un Componente de Cliente (Hook)

```typescript
// lib/hooks/use-permisos.ts
'use client'

import { useEffect, useState } from 'react'
import { obtenerUsuarioActual, obtenerPermisosCRUD, type PermisoComponente } from '@/lib/supabase/permissions'

export function usePermisos(moduloNombre: string) {
  const [permisos, setPermisos] = useState<PermisoComponente | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargarPermisos() {
      const usuario = await obtenerUsuarioActual()
      if (usuario) {
        const p = await obtenerPermisosCRUD(usuario.id, moduloNombre)
        setPermisos(p)
      }
      setLoading(false)
    }

    cargarPermisos()
  }, [moduloNombre])

  return { permisos, loading }
}
```

---

## 📊 Modelo de Datos - Resumen

### Tablas Principales
1. **usuarios** - Información completa de personas
2. **perfiles** - Roles del sistema
3. **modulos** - Módulos funcionales
4. **permisos** - Permisos CRUD
5. **perfil_permiso_modulo** - Relación perfiles ↔ permisos ↔ módulos
6. **usuario_perfil** - Asignación de perfiles a usuarios
7. **jerarquia_usuarios** - Estructura organizacional

### Tablas de Catálogos
8. **ciudades**
9. **localidades**
10. **barrios**
11. **zonas**
12. **tipos_referencia**
13. **niveles_escolaridad**
14. **tipos_vivienda**

---

## 🎯 Siguiente Acción Recomendada

¿Quieres que comience a crear los módulos? Puedo empezar por:

1. **Módulo de Personas** (listado, formulario, detalle)
2. **Módulo de Administración** (perfiles, permisos)
3. **Hooks y utilidades** para facilitar el desarrollo

¿Por cuál prefieres que empiece?
