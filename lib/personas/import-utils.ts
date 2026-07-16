// Normalización compartida entre el importador de Excel del módulo Personas
// y (futuro) cualquier otra vía de carga masiva. Mismas reglas de negocio que
// ya se usaron en cambios/run_migration.py, portadas a TS para poder correr
// en el servidor de Next.js con feedback en vivo (barra de progreso).

export const GENERO_MAP: Record<string, string> = {
    masculino: 'Masculino', femenino: 'Femenino', otro: 'Otro',
    m: 'Masculino', f: 'Femenino',
    hombre: 'Masculino', mujer: 'Femenino',
}

export const ESCOLARIDAD_MAP: Record<string, string> = {
    primaria: 'Primaria', bachillerato: 'Bachillerato', bachiller: 'Bachillerato',
    tecnico: 'Técnico', 'técnico': 'Técnico',
    tecnologo: 'Tecnólogo', 'tecnólogo': 'Tecnólogo',
    profesional: 'Profesional',
    especializacion: 'Especialización', 'especialización': 'Especialización',
    maestria: 'Maestría', 'maestría': 'Maestría', mba: 'Maestría',
    doctorado: 'Doctorado', ninguno: 'Ninguno', ninguna: 'Ninguno', 'sin estudios': 'Ninguno',
    universitario: 'Profesional', postgrado: 'Especialización', normalista: 'Bachillerato',
}

export const VIVIENDA_MAP: Record<string, string> = {
    propia: 'Propia', arrendada: 'Arrendada', arriendo: 'Arrendada',
    familiar: 'Familiar', otra: 'Otra', otro: 'Otra',
}

export const ESTADO_MAP: Record<string, string> = {
    activo: 'activo', inactivo: 'inactivo', suspendido: 'suspendido',
    active: 'activo', inactive: 'inactivo',
}

export const TIPO_VALIDOS = new Set(['80001', '80002', '80003', '80004', '80005'])

export function normMap(val: string | null | undefined, mapping: Record<string, string>): string | null {
    if (!val) return null
    const v = String(val).trim()
    if (mapping[v]) return mapping[v]
    const vl = v.toLowerCase()
    return mapping[vl] ?? null
}

export function q(v: any): string | null {
    if (v === null || v === undefined) return null
    if (typeof v === 'number' && Number.isNaN(v)) return null
    const s = String(v).trim()
    if (['', 'nan', 'NaN', 'None', 'nat', 'NaT', 'undefined', 'null'].includes(s)) return null
    return s
}

export function qInt(v: any): number {
    const s = q(v)
    if (s === null) return 0
    const f = parseFloat(s)
    return Number.isNaN(f) ? 0 : Math.round(f)
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/

export function qEmail(v: any): string | null {
    const s = q(v)
    if (!s) return null
    const sl = s.toLowerCase()
    return EMAIL_RE.test(sl) ? sl : null
}

// Excel guarda las fechas como un número serial de días desde 1899-12-30.
// Si la celda pierde el formato de fecha (pasa seguido después de varios
// ciclos de exportar/editar/reimportar el mismo archivo), sheet_to_json
// entrega ese número plano ("31350") en vez de una fecha real, y Postgres
// lo rechaza con "invalid input syntax for type date". Esta función
// normaliza cualquier forma razonable en la que pueda venir una fecha del
// Excel a YYYY-MM-DD, o null si no se puede interpretar con confianza
// (mejor omitir el dato que inventar una fecha equivocada).
// Valida que año/mes/día formen una fecha real (rechaza mes 0, día 0, día
// 31 de febrero, etc.) usando un round-trip por Date en vez de solo mirar
// el formato — "0000-00-00" (el "sin fecha" típico de exports de MySQL)
// tiene la FORMA de una fecha ISO pero no es una fecha real.
function esFechaValida(year: number, month: number, day: number): boolean {
    if (year <= 0 || month < 1 || month > 12 || day < 1 || day > 31) return false
    const d = new Date(Date.UTC(year, month - 1, day))
    return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
}

export function qFecha(v: any): string | null {
    if (v === null || v === undefined) return null
    if (v instanceof Date) {
        return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10)
    }
    const s = q(v)
    if (!s) return null

    // Ya viene como fecha ISO (o con hora pegada). Ej. "0000-00-00" calza el
    // formato pero no es una fecha real — se descarta en vez de mandarla a
    // Postgres (que la rechaza con "date/time field value out of range").
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) {
        const [, y, m, d] = iso
        return esFechaValida(parseInt(y, 10), parseInt(m, 10), parseInt(d, 10)) ? `${y}-${m}-${d}` : null
    }

    // DD/MM/YYYY o DD-MM-YYYY (formato colombiano habitual en estos Excel).
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (dmy) {
        const day = parseInt(dmy[1], 10)
        const month = parseInt(dmy[2], 10)
        const year = parseInt(dmy[3], 10)
        return esFechaValida(year, month, day)
            ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            : null
    }

    // Número serial de Excel (celda mal formateada como texto/general).
    if (/^\d+(\.\d+)?$/.test(s)) {
        const serial = parseFloat(s)
        if (serial > 0 && serial < 73050) { // ~ hasta el año 2100
            const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000)
            if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
        }
        return null
    }

    return null
}

export function fixCedula(v: any): string {
    const s = q(v)
    if (!s) return ''
    const f = parseFloat(s)
    if (!Number.isNaN(f) && /^-?\d+(\.\d+)?$/.test(s)) return String(Math.trunc(f))
    return s
}

export function splitNombre(nombreCompleto: string): { nombres: string; apellidos: string } {
    const parts = String(nombreCompleto || '').trim().toUpperCase().split(/\s+/).filter(Boolean)
    const n = parts.length
    if (n === 0) return { nombres: '', apellidos: '' }
    if (n === 1) return { nombres: parts[0], apellidos: '' }
    if (n === 2) return { nombres: parts[0], apellidos: parts[1] }
    if (n === 3) return { nombres: parts[0], apellidos: parts.slice(1).join(' ') }
    return { nombres: parts.slice(0, 2).join(' '), apellidos: parts.slice(2).join(' ') }
}

// El Excel de Personas solo trae el NOMBRE de coordinador/dirigente/referencia
// (nunca su cédula, email o teléfono completo — esos datos son del militante,
// no de quien lo referencia). Cuando el import necesita crear ese registro
// desde cero porque todavía no existe, no puede inventar una cédula real: en
// vez de eso genera un identificador "PENDIENTE-*" y un correo con dominio
// @pendiente.apolo, ambos fáciles de detectar y filtrar después para
// completarlos con el dato real desde su propio módulo (Coordinador/Dirigente).
export function generarDocumentoPendiente(): string {
    return `PENDIENTE-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
}

export function generarEmailPendiente(nombreCompleto: string): string {
    const slug = String(nombreCompleto || 'sin-nombre')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar tildes
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '') || 'sin-nombre'
    const suffix = Math.random().toString(36).slice(2, 8)
    return `pendiente.${slug}.${suffix}@pendiente.apolo`
}

// Cabeceras EXACTAS del Excel "Personas (78).xlsx" — el export las genera
// y el import las espera de vuelta, para que el archivo sea 100% redondeable.
export const EXCEL_HEADERS = [
    'ID', 'CEDULA', 'ESTADO', 'OBSERVACIONES', 'FECHA', 'NOMBRE COMPLETO', 'COORDINADOR', 'DIRIGENTE',
    'TIPO', 'TALLA', 'LUGAR NACIMIENTO', 'DIRECCIÓN', 'TELEFONO FIJO', 'CIUDAD', 'BARRIO',
    'LOCALIDAD', 'NACIMIENTO', 'GENERO', 'EMAIL', 'REFERENCIA', 'TEL REFERENCIA', 'VIVIENDA',
    'FACEBOOK', 'INSTAGRAM', 'TWITTER', 'WHATSAPP', 'ESTUDIOS', 'OCUPACION',
    'COMP. DIFUSIÓN', 'COMP. MARKETING', 'COMP. IMPACTO', 'COMP. CAUTIVO', 'COMP. PROYECTO',
    'VERIFICACIÓN STICKER', 'FECHA VERIFICACIÓN STICKER',
    'NOMBRE VERIFICADOR', 'BENEFICIARIO', 'POBLACION', 'UBICACION', 'HIJOS', 'IDEOLOGÍA',
] as const

export interface ResultadoLote {
    creados: number
    actualizados: number
    errores: { fila: number; cedula: string; error: string }[]
}
