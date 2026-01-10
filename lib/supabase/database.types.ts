// @ts-nocheck
// ADVERTENCIA: Este archivo fue modificado manualmente para añadir la tabla 'tipos_militante'.
// Por favor, regenera los tipos de Supabase ejecutando el comando de la CLI apropiado
// después de actualizar el esquema de tu base de datos para asegurar la consistencia.
// Ejemplo: npx supabase gen types typescript --project-id <tu-project-id> > lib/supabase/database.types.ts

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            tipos_militante: {
                Row: {
                    id: string
                    codigo: number
                    descripcion: string
                    activo: boolean
                    creado_en: string
                }
                Insert: {
                    id?: string
                    codigo: number
                    descripcion: string
                    activo?: boolean
                    creado_en?: string
                }
                Update: {
                    id?: string
                    codigo?: number
                    descripcion?: string
                    activo?: boolean
                    creado_en?: string
                }
            }
            barrios: {
                Row: {
                    id: string
                    nombre: string
                    codigo: string | null
                    localidad_id: string | null
                    ciudad_id: string | null
                    activo: boolean
                    orden: number | null
                    creado_en: string
                    actualizado_en: string
                }
                Insert: {
                    id?: string
                    nombre: string
                    codigo?: string | null
                    localidad_id?: string | null
                    ciudad_id?: string | null
                    activo?: boolean
                    orden?: number | null
                    creado_en?: string
                    actualizado_en?: string
                }
                Update: {
                    id?: string
                    nombre?: string
                    codigo?: string | null
                    localidad_id?: string | null
                    ciudad_id?: string | null
                    activo?: boolean
                    orden?: number | null
                    creado_en?: string
                    actualizado_en?: string
                }
            }
            ciudades: {
                Row: {
                    id: string
                    nombre: string
                    codigo: string | null
                    activo: boolean
                    orden: number | null
                    creado_en: string
                    actualizado_en: string
                }
                Insert: {
                    id?: string
                    nombre: string
                    codigo?: string | null
                    activo?: boolean
                    orden?: number | null
                    creado_en?: string
                    actualizado_en?: string
                }
                Update: {
                    id?: string
                    nombre?: string
                    codigo?: string | null
                    activo?: boolean
                    orden?: number | null
                    creado_en?: string
                    actualizado_en?: string
                }
            }
            jerarquia_usuarios: {
                Row: {
                    id: string
                    usuario_id: string
                    superior_id: string | null
                    tipo_relacion: string | null
                    fecha_inicio: string
                    fecha_fin: string | null
                    activo: boolean
                    creado_en: string
                    creado_por: string | null
                }
                Insert: {
                    id?: string
                    usuario_id: string
                    superior_id?: string | null
                    tipo_relacion?: string | null
                    fecha_inicio?: string
                    fecha_fin?: string | null
                    activo?: boolean
                    creado_en?: string
                    creado_por?: string | null
                }
                Update: {
                    id?: string
                    usuario_id?: string
                    superior_id?: string | null
                    tipo_relacion?: string | null
                    fecha_inicio?: string
                    fecha_fin?: string | null
                    activo?: boolean
                    creado_en?: string
                    creado_por?: string | null
                }
            }
            localidades: {
                Row: {
                    id: string
                    nombre: string
                    codigo: string | null
                    ciudad_id: string | null
                    activo: boolean
                    orden: number | null
                    creado_en: string
                    actualizado_en: string
                }
                Insert: {
                    id?: string
                    nombre: string
                    codigo?: string | null
                    ciudad_id?: string | null
                    activo?: boolean
                    orden?: number | null
                    creado_en?: string
                    actualizado_en?: string
                }
                Update: {
                    id?: string
                    nombre?: string
                    codigo?: string | null
                    ciudad_id?: string | null
                    activo?: boolean
                    orden?: number | null
                    creado_en?: string
                    actualizado_en?: string
                }
            }
            modulos: {
                Row: {
                    id: string
                    nombre: string
                    descripcion: string | null
                    icono: string | null
                    ruta: string | null
                    orden: number | null
                    modulo_padre_id: string | null
                    activo: boolean
                    obligatorio: boolean
                    creado_en: string
                    actualizado_en: string
                }
                Insert: {
                    id?: string
                    nombre: string
                    descripcion?: string | null
                    icono?: string | null
                    ruta?: string | null
                    orden?: number | null
                    modulo_padre_id?: string | null
                    activo?: boolean
                    obligatorio?: boolean
                    creado_en?: string
                    actualizado_en?: string
                }
                Update: {
                    id?: string
                    nombre?: string
                    descripcion?: string | null
                    icono?: string | null
                    ruta?: string | null
                    orden?: number | null
                    modulo_padre_id?: string | null
                    activo?: boolean
                    obligatorio?: boolean
                    creado_en?: string
                    actualizado_en?: string
                }
            }
            niveles_escolaridad: {
                Row: {
                    id: string
                    nombre: string
                    orden: number | null
                    activo: boolean
                    creado_en: string
                }
                Insert: {
                    id?: string
                    nombre: string
                    orden?: number | null
                    activo?: boolean
                    creado_en?: string
                }
                Update: {
                    id?: string
                    nombre?: string
                    orden?: number | null
                    activo?: boolean
                    creado_en?: string
                }
            }
            perfil_permiso_modulo: {
                Row: {
                    id: string
                    perfil_id: string
                    modulo_id: string
                    permiso_id: string
                    condiciones: Json | null
                    creado_en: string
                    creado_por: string | null
                }
                Insert: {
                    id?: string
                    perfil_id: string
                    modulo_id: string
                    permiso_id: string
                    condiciones?: Json | null
                    creado_en?: string
                    creado_por?: string | null
                }
                Update: {
                    id?: string
                    perfil_id?: string
                    modulo_id?: string
                    permiso_id?: string
                    condiciones?: Json | null
                    creado_en?: string
                    creado_por?: string | null
                }
            }
            perfiles: {
                Row: {
                    id: string
                    nombre: string
                    descripcion: string | null
                    nivel_jerarquico: number | null
                    activo: boolean
                    creado_en: string
                    actualizado_en: string
                }
                Insert: {
                    id?: string
                    nombre: string
                    descripcion?: string | null
                    nivel_jerarquico?: number | null
                    activo?: boolean
                    creado_en?: string
                    actualizado_en?: string
                }
                Update: {
                    id?: string
                    nombre?: string
                    descripcion?: string | null
                    nivel_jerarquico?: number | null
                    activo?: boolean
                    creado_en?: string
                    actualizado_en?: string
                }
            }
            permisos: {
                Row: {
                    id: string
                    nombre: string
                    descripcion: string | null
                    codigo: string
                    creado_en: string
                }
                Insert: {
                    id?: string
                    nombre: string
                    descripcion?: string | null
                    codigo: string
                    creado_en?: string
                }
                Update: {
                    id?: string
                    nombre?: string
                    descripcion?: string | null
                    codigo?: string
                    creado_en?: string
                }
            }
            tipos_referencia: {
                Row: {
                    id: string
                    nombre: string
                    descripcion: string | null
                    activo: boolean
                    orden: number | null
                    creado_en: string
                }
                Insert: {
                    id?: string
                    nombre: string
                    descripcion?: string | null
                    activo?: boolean
                    orden?: number | null
                    creado_en?: string
                }
                Update: {
                    id?: string
                    nombre?: string
                    descripcion?: string | null
                    activo?: boolean
                    orden?: number | null
                    creado_en?: string
                }
            }
            tipos_vivienda: {
                Row: {
                    id: string
                    nombre: string
                    orden: number | null
                    activo: boolean
                    creado_en: string
                }
                Insert: {
                    id?: string
                    nombre: string
                    orden?: number | null
                    activo?: boolean
                    creado_en?: string
                }
                Update: {
                    id?: string
                    nombre?: string
                    orden?: number | null
                    activo?: boolean
                    creado_en?: string
                }
            }
            usuario_perfil: {
                Row: {
                    id: string
                    usuario_id: string
                    perfil_id: string
                    es_principal: boolean
                    fecha_asignacion: string
                    fecha_revocacion: string | null
                    activo: boolean
                    asignado_por: string | null
                }
                Insert: {
                    id?: string
                    usuario_id: string
                    perfil_id: string
                    es_principal?: boolean
                    fecha_asignacion?: string
                    fecha_revocacion?: string | null
                    activo?: boolean
                    asignado_por?: string | null
                }
                Update: {
                    id?: string
                    usuario_id?: string
                    perfil_id?: string
                    es_principal?: boolean
                    fecha_asignacion?: string
                    fecha_revocacion?: string | null
                    activo?: boolean
                    asignado_por?: string | null
                }
            }
            usuarios: {
                Row: {
                    id: string
                    tipo_documento: string
                    numero_documento: string
                    nombres: string
                    apellidos: string
                    email: string | null
                    foto_perfil_url: string | null
                    celular: string | null
                    whatsapp: string | null
                    telefono: string | null
                    direccion: string | null
                    barrio_id: string | null
                    barrio_nombre: string | null
                    localidad_id: string | null
                    localidad_nombre: string | null
                    ciudad_id: string | null
                    ciudad_nombre: string | null
                    fecha_nacimiento: string | null
                    lugar_nacimiento: string | null
                    genero: string | null
                    estado_civil: string | null
                    numero_hijos: number
                    nivel_escolaridad: string | null
                    perfil_ocupacion: string | null
                    tipo_vivienda: string | null
                    talla_camisa: string | null
                    facebook: string | null
                    twitter: string | null
                    instagram: string | null
                    nombre_familiar_cercano: string | null
                    celular_familiar_cercano: string | null
                    referencia_seleccion: string | null
                    telefono_referencia: string | null
                    ubicacion: string | null
                    cargo_actual: string | null
                    beneficiario: string | null
                    zona_id: string | null
                    zona_nombre: string | null
                    compromiso_marketing: number
                    compromiso_impacto: number
                    compromiso_cautivo: number
                    compromiso_privado: string | null
                    observaciones: string | null
                    latitud: number | null
                    longitud: number | null
                    auth_user_id: string | null
                    ultimo_acceso: string | null
                    estado: string
                    creado_en: string
                    actualizado_en: string
                    creado_por: string | null
                    actualizado_por: string | null
                }
                Insert: {
                    id?: string
                    tipo_documento?: string
                    numero_documento: string
                    nombres: string
                    apellidos: string
                    email?: string | null
                    foto_perfil_url?: string | null
                    celular?: string | null
                    whatsapp?: string | null
                    telefono?: string | null
                    direccion?: string | null
                    barrio_id?: string | null
                    barrio_nombre?: string | null
                    localidad_id?: string | null
                    localidad_nombre?: string | null
                    ciudad_id?: string | null
                    ciudad_nombre?: string | null
                    fecha_nacimiento?: string | null
                    lugar_nacimiento?: string | null
                    genero?: string | null
                    estado_civil?: string | null
                    numero_hijos?: number
                    nivel_escolaridad?: string | null
                    perfil_ocupacion?: string | null
                    tipo_vivienda?: string | null
                    talla_camisa?: string | null
                    facebook?: string | null
                    twitter?: string | null
                    instagram?: string | null
                    nombre_familiar_cercano?: string | null
                    celular_familiar_cercano?: string | null
                    referencia_seleccion?: string | null
                    telefono_referencia?: string | null
                    ubicacion?: string | null
                    cargo_actual?: string | null
                    beneficiario?: string | null
                    zona_id?: string | null
                    zona_nombre?: string | null
                    compromiso_marketing?: number
                    compromiso_impacto?: number
                    compromiso_cautivo?: number
                    compromiso_privado?: string | null
                    observaciones?: string | null
                    latitud?: number | null
                    longitud?: number | null
                    auth_user_id?: string | null
                    ultimo_acceso?: string | null
                    estado?: string
                    creado_en?: string
                    actualizado_en?: string
                    creado_por?: string | null
                    actualizado_por?: string | null
                }
                Update: {
                    id?: string
                    tipo_documento?: string
                    numero_documento?: string
                    nombres?: string
                    apellidos?: string
                    email?: string | null
                    foto_perfil_url?: string | null
                    celular?: string | null
                    whatsapp?: string | null
                    telefono?: string | null
                    direccion?: string | null
                    barrio_id?: string | null
                    barrio_nombre?: string | null
                    localidad_id?: string | null
                    localidad_nombre?: string | null
                    ciudad_id?: string | null
                    ciudad_nombre?: string | null
                    fecha_nacimiento?: string | null
                    lugar_nacimiento?: string | null
                    genero?: string | null
                    estado_civil?: string | null
                    numero_hijos?: number
                    nivel_escolaridad?: string | null
                    perfil_ocupacion?: string | null
                    tipo_vivienda?: string | null
                    talla_camisa?: string | null
                    facebook?: string | null
                    twitter?: string | null
                    instagram?: string | null
                    nombre_familiar_cercano?: string | null
                    celular_familiar_cercano?: string | null
                    referencia_seleccion?: string | null
                    telefono_referencia?: string | null
                    ubicacion?: string | null
                    cargo_actual?: string | null
                    beneficiario?: string | null
                    zona_id?: string | null
                    zona_nombre?: string | null
                    compromiso_marketing?: number
                    compromiso_impacto?: number
                    compromiso_cautivo?: number
                    compromiso_privado?: string | null
                    observaciones?: string | null
                    latitud?: number | null
                    longitud?: number | null
                    auth_user_id?: string | null
                    ultimo_acceso?: string | null
                    estado?: string
                    creado_en?: string
                    actualizado_en?: string
                    creado_por?: string | null
                    actualizado_por?: string | null
                }
            }
            zonas: {
                Row: {
                    id: string
                    nombre: string
                    descripcion: string | null
                    codigo: string | null
                    color: string | null
                    activo: boolean
                    creado_en: string
                    actualizado_en: string
                }
                Insert: {
                    id?: string
                    nombre: string
                    descripcion?: string | null
                    codigo?: string | null
                    color?: string | null
                    activo?: boolean
                    creado_en?: string
                    actualizado_en?: string
                }
                Update: {
                    id?: string
                    nombre?: string
                    descripcion?: string | null
                    codigo?: string | null
                    color?: string | null
                    activo?: boolean
                    creado_en?: string
                    actualizado_en?: string
                }
            }
        }
        Views: {
            v_usuarios_perfiles: {
                Row: {
                    usuario_id: string | null
                    numero_documento: string | null
                    tipo_documento: string | null
                    nombres: string | null
                    apellidos: string | null
                    email: string | null
                    celular: string | null
                    estado: string | null
                    ciudad: string | null
                    zona: string | null
                    perfiles: string | null
                    creado_en: string | null
                }
            }
        }
        Functions: {
            tiene_permiso: {
                Args: {
                    p_usuario_id: string
                    p_modulo_nombre: string
                    p_permiso_codigo: string
                }
                Returns: boolean
            }
            obtener_permisos_usuario: {
                Args: {
                    p_usuario_id: string
                }
                Returns: {
                    modulo_nombre: string
                    modulo_ruta: string
                    permiso_codigo: string
                    permiso_nombre: string
                }[]
            }
        }
        Enums: {}
    }
}
