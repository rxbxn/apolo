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
