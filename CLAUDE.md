# APOLO — Arquitectura y Reglas del Proyecto

## Arquitectura de datos

**Todos los registros son militantes.** Cada fila del Excel (Personas 78.xlsx) es un militante
con su información completa. Un militante puede tener rol de coordinador o dirigente; si cambia
de rol, sigue siendo militante.

### Tablas principales
| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Datos personales de TODAS las personas (1 fila por persona) |
| `militantes` | Rol y compromisos de cada persona. FK → `usuarios.id` y `coordinadores.id` |
| `coordinadores` | Personas con rol coordinador/dirigente. FK → `usuarios.id` |
| `dirigentes` | Relación dirigente ↔ coordinador superior |
| `tipos_militante` | Catálogo: 80001=Militante, 80002=Coord Zona, 80003=Dirigente, 80004=Coord Local, 80005=Coord Municipal |

### Regla de doble rol
Coordinadores y dirigentes aparecen en **ambas** tablas: `coordinadores` Y `militantes`.
Nunca eliminar una persona de militantes aunque tenga rol superior.

## Módulo Personas
- Muestra **todos** los militantes con toda su información
- Columnas clave: Nombre, **Tipo** (rol), **Coordinador asignado**, Contacto, Ciudad, Estado
- Filtros: búsqueda, estado, ciudad, **tipo de militante**
- El tipo se obtiene de `coordinadores → perfiles → nombre`; si no tiene coordinador = "Militante"
- El coordinador asignado se obtiene de `militantes.coordinador_id → coordinadores → usuarios`

## Compromisos
Los compromisos viven en la tabla `militantes`, NO en `usuarios`:
- `compromiso_marketing`, `compromiso_cautivo`, `compromiso_impacto` → en `militantes`
- `compromiso_difusion`, `compromiso_proyecto` → en `militantes`

## Fechas
- `creado_en` en `usuarios` = fecha de ingreso/registro (se mapea a `fecha_registro` en el form)
- `fecha_nacimiento` → en `usuarios`

## Modelo de trabajo
- Usar modelo **Sonnet** (no Opus)
- Crear plan antes de implementar cambios grandes
- Por defecto todas las preguntas de encuesta son obligatorias (`required: true`)
- El responsive no debe colapsar en tarjetas — usar filas compactas
