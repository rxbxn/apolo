# Prompt para Generar Formulario de Gestión y Compromisos

## Contexto
Necesito que generes un formulario completo basado en la siguiente estructura, manteniendo el estilo visual y funcional de mi proyecto actual.

## Especificaciones del Formulario

### 1. ENCABEZADO
- **Título**: "Formato de gestión y compromisos" con ícono de checkmark (✓)
- **Campo**: No. Formulario (input text, solo lectura o autoincremental)

---

### 2. SECCIÓN SUPERIOR - INFORMACIÓN PERSONAL Y CONTACTO

**Fila 1 - Tres columnas:**
- **Columna 1**: "Militante"
  - Tipo: Dropdown/Select
  - Valor mostrado: ADALBERTO JIMÉNEZ PERTUZ
  
- **Columna 2**: "Dirigente"
  - Tipo: Dropdown/Select
  - Valor mostrado: MAYRA ALEJANDRA OCHOA CASTILLO
  
- **Columna 3**: "Coordinador"
  - Tipo: Dropdown/Select
  - Valor mostrado: PAOLA SUGEY OSPINO ZAMBRANO

**Fila 2 - Tres columnas:**
- **Columna 1**: "Teléfono"
  - Tipo: Input text/number
  - Valor mostrado: 3216141339
  
- **Columna 2**: "Localidad"
  - Tipo: Input text
  - Valor mostrado: ORIENTE
  
- **Columna 3**: "Receptor"
  - Tipo: Dropdown/Select
  - Valor mostrado: ALVARO MIGUEL PINEDA PEREZ

---

### 3. SECCIÓN DE BADGES/INDICADORES

**Fila con badges horizontales (color teal/turquesa):**
- Badge 1: "📢 Difusión:" (con icono de megáfono)
- Badge 2: "✓ Limpio: 13"
- Badge 3: "✓ Limpio: 0"
- Badge 4: "👤 Líder: 80001"
- Badge 5: "💬 Compro: GESTIÓN PRIVADA"

---

### 4. SECCIÓN DE SOLICITUD Y GESTOR

**Fila con dos columnas principales:**
- **Columna 1 (70%)**: "Gestor Asignado" + Textarea "Solicitud"
  - Label pequeño arriba: "Gestor Asignado"
  - Input text con borde inferior
  - Textarea amplio con placeholder "Solicitud"
  - Ícono de edición (✏️) a la izquierda del textarea
  
- **Columna 2 (30%)**: "Fecha necesidad"
  - Tipo: Date picker
  - Valor: 10/12/2025
  - Alineado a la derecha

---

### 5. SECCIÓN DINÁMICA - SOLICITUDES DE GESTIÓN

**Título**: "SOLICITUDES DE GESTIÓN"

**Tabla dinámica con las siguientes columnas:**
1. **Elemento** - Dropdown/Select
2. **Unidad** - Dropdown/Select
3. **Categoría** - Dropdown/Select
4. **Sector** - Dropdown/Select
5. **Cantidad** - Input number

**Características:**
- Debe tener mínimo 5 filas visibles inicialmente
- Botón para agregar más filas dinámicamente ("+")
- Botón para eliminar filas individuales ("×" o ícono basura)
- Todas las filas deben tener el mismo formato
- Los dropdowns deben cargarse desde datos del backend

---

### 6. SECCIÓN INFERIOR - AUTORIZACIÓN Y OBSERVACIONES

**Fila 1 - Dos columnas:**
- **Columna 1**: "Autorización Total"
  - Tipo: Input number/decimal
  - Formato moneda
  
- **Columna 2**: "Entregas Fecha"
  - Tipo: Date picker
  - Formato: dd/mm/aaaa

**Fila 2 - Dos columnas:**
- **Columna 1**: "Prioridad"
  - Tipo: Dropdown/Select
  - Opciones: "-- Seleccione --", "Alta", "Media", "Baja"
  - Valor por defecto: "-- Seleccione --"
  
- **Columna 2**: "Observaciones" (asociado a prioridad)
  - Tipo: Textarea
  - Ícono de edición (✏️)
  - Placeholder: "Observaciones de prioridad"

**Fila 3 - Campo completo:**
- "Observaciones" (generales)
  - Tipo: Textarea grande
  - Ícono de edición (✏️)
  - Ocupa todo el ancho
  - Label: "Observaciones"

---

## Requisitos Técnicos

### Frontend
1. **Framework**: [Tu framework actual - React/Vue/Angular]
2. **Estilos**: Mantener la paleta de colores del proyecto
   - Color principal para badges: Teal/Turquesa (#14b8a6 o similar)
   - Bordes: Grises suaves
   - Fondos: Blancos/Grises muy claros
3. **Componentes**:
   - Usar componentes de formulario existentes del proyecto
   - Dropdowns con búsqueda (Select2, vue-select, o similar)
   - Date pickers con el estilo del proyecto
4. **Validación**:
   - Campos obligatorios: Militante, Dirigente, Coordinador, Fecha necesidad
   - Validar formato de teléfono
   - Validar que la tabla tenga al menos 1 fila con datos

### Backend
1. **Estructura de datos**:
```javascript
{
  numero_formulario: string,
  militante: string,
  dirigente: string,
  coordinador: string,
  telefono: string,
  localidad: string,
  receptor: string,
  estado_difusion: boolean,
  limpio_count: number,
  limpio_pendiente: number,
  lider_codigo: string,
  tipo_gestion: string,
  gestor_asignado: string,
  solicitud: string,
  fecha_necesidad: date,
  solicitudes: [
    {
      elemento: string,
      unidad: string,
      categoria: string,
      sector: string,
      cantidad: number,
      orden: number
    }
  ],
  autorizacion_total: decimal,
  entregas_fecha: date,
  prioridad: string,
  observaciones_prioridad: string,
  observaciones_generales: string
}
```

2. **Endpoints**:
   - `POST /api/formato-gestion` - Crear nuevo formato
   - `PUT /api/formato-gestion/:id` - Actualizar formato
   - `GET /api/formato-gestion/:id` - Obtener formato
   - `GET /api/formato-gestion` - Listar formatos

3. **Catálogos necesarios**:
   - `GET /api/catalogos/militantes`
   - `GET /api/catalogos/dirigentes`
   - `GET /api/catalogos/coordinadores`
   - `GET /api/catalogos/receptores`
   - `GET /api/catalogos/elementos`
   - `GET /api/catalogos/unidades`
   - `GET /api/catalogos/categorias`
   - `GET /api/catalogos/sectores`

---

## Funcionalidades Adicionales

1. **Guardado automático**: Implementar autosave cada 30 segundos
2. **Historial**: Registrar cambios en tabla de auditoría
3. **Permisos**: Solo usuarios autorizados pueden crear/editar
4. **Exportación**: Botón para exportar a PDF/Excel
5. **Notificaciones**: Alertas cuando se crea/modifica un formato
6. **Estados**: Borrador, Enviado, Aprobado, Rechazado

---

## Consideraciones de UX

1. **Responsive**: El formulario debe adaptarse a tablets y móviles
2. **Accesibilidad**: Labels correctos, contraste adecuado, navegación por teclado
3. **Feedback visual**: Indicadores de guardado, errores claros, confirmaciones
4. **Performance**: Carga lazy de catálogos grandes
5. **Tooltips**: Ayudas contextuales en campos complejos

---

## Notas Importantes

- **NO incluir** estilos de terceros que no estén en el proyecto
- **Reutilizar** componentes existentes del proyecto
- **Mantener** la consistencia visual con otros formularios del sistema
- **Validar** en frontend Y backend
- **Considerar** transacciones para guardar formato + solicitudes de forma atómica