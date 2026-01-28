import { supabase } from './client'
import type { Database } from './database.types'

type Usuario = Database['public']['Tables']['usuarios']['Row']
type Perfil = Database['public']['Tables']['perfiles']['Row']
type Modulo = Database['public']['Tables']['modulos']['Row']
type Permiso = Database['public']['Tables']['permisos']['Row']

/**
 * Verifica si el usuario actual tiene un permiso específico en un módulo
 */
export async function tienePermiso(
    usuarioId: string,
    moduloNombre: string,
    permisoCode: string
): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('tiene_permiso', {
            p_usuario_id: usuarioId,
            p_modulo_nombre: moduloNombre,
            p_permiso_codigo: permisoCode,
        } as any)

        if (error) {
            console.error('Error verificando permiso (rpc):', error)
            // continuar con fallback
        }

        // Si la RPC indica que tiene permiso, devolver true
        if (data) {
            return data as unknown as boolean
        }

        // Fallback: revisar si existe un coordinador con ese usuario_id y verificar por perfil_id
        try {
            const { data: coord, error: coordErr } = await supabase
                .from('coordinadores')
                .select('perfil_id')
                .eq('usuario_id', usuarioId)
                .limit(1)
                .single()

            if (!coordErr && coord && (coord as any).perfil_id) {
                const perfilId = (coord as any).perfil_id
                const { data: rows, error: rowsErr } = await supabase
                    .from('perfil_permiso_modulo')
                    .select('modulos(nombre, activo), permisos(codigo)')
                    .eq('perfil_id', perfilId)

                if (rows && (rows as any[]).length > 0) {
                    const found = (rows as any[]).some(
                        (r) =>
                            r.modulos?.nombre === moduloNombre &&
                            r.permisos?.codigo === permisoCode &&
                            r.modulos?.activo !== false
                    )
                    return found
                }
            }
        } catch (e) {
            console.warn('Error fallback de tienePermiso:', e)
        }

        return false
    } catch (error) {
        console.error('Error en tienePermiso:', error)
        return false
    }
}

/**
 * Obtiene todos los permisos del usuario actual
 */
export async function obtenerPermisosUsuario(usuarioId: string) {
    try {
        // Intentar obtener permisos desde la función RPC (lo ideal)
        const { data, error } = await supabase.rpc('obtener_permisos_usuario', {
            p_usuario_id: usuarioId,
        } as any)

        if (error) {
            console.error('Error obteniendo permisos (rpc):', error)
        }

        if (data && (data as any[]).length > 0) {
            return data as any[]
        }

        // Fallback: buscar si existe un coordinador con ese usuario_id y usar su perfil_id
        try {
            const { data: coord, error: coordErr } = await supabase
                .from('coordinadores')
                .select('perfil_id')
                .eq('usuario_id', usuarioId)
                .limit(1)
                .single()

            if (!coordErr && coord && (coord as any).perfil_id) {
                const perfilId = (coord as any).perfil_id

                // Obtener permisos a partir de perfil_permiso_modulo y mapear al mismo shape que la RPC
                const { data: rows, error: rowsErr } = await supabase
                    .from('perfil_permiso_modulo')
                    .select('modulos(nombre, ruta, activo), permisos(codigo, nombre)')
                    .eq('perfil_id', perfilId)

                if (rows && (rows as any[]).length > 0) {
                    const mapped = (rows as any[])
                        .filter((r) => r.modulos?.activo !== false)
                        .map((r) => ({
                            modulo_nombre: r.modulos?.nombre || null,
                            modulo_ruta: r.modulos?.ruta || null,
                            permiso_codigo: r.permisos?.codigo || null,
                            permiso_nombre: r.permisos?.nombre || null,
                        }))

                    return mapped
                }
            }
        } catch (e) {
            console.warn('Error en fallback de obtenerPermisosUsuario:', e)
        }

        return []
    } catch (error) {
        console.error('Error en obtenerPermisosUsuario:', error)
        return []
    }
}

/**
 * Obtiene el usuario actual desde la sesión de Supabase
 */
export async function obtenerUsuarioActual() {
    try {
        const {
            data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
            // Si no hay sesión, permitir continuar (importación masiva, sin autenticación)
            return null
        }

        // Buscar el usuario en la tabla usuarios por auth_user_id
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .maybeSingle()

        if (error) {
            console.error('Error obteniendo usuario:', error)
            // No throw: continuará intentando fallback
        }

        if (usuario) {
            return usuario
        }

        // Fallback: Si no se encuentra en usuarios, verificar si el auth_user_id corresponde a un coordinador
        try {
            const { data: coord, error: coordErr } = await supabase
                .from('coordinadores')
                .select('usuario_id, perfil_id, email')
                .eq('auth_user_id', session.user.id)
                .maybeSingle()

            if (!coordErr && coord) {
                // Intentar obtener la persona/usuario referenciado por coordinadores.usuario_id
                try {
                    const { data: usuarioById, error: usuarioByIdErr } = await supabase
                        .from('usuarios')
                        .select('*')
                        .eq('id', (coord as any).usuario_id)
                        .maybeSingle()

                    if (!usuarioByIdErr && usuarioById) {
                        return usuarioById
                    }

                    // Si no existe usuario con ese id, devolver un objeto mínimo que permita verificar permisos
                    return {
                        id: (coord as any).usuario_id,
                        nombres: null,
                        apellidos: null,
                        email: (coord as any).email || null,
                        perfil_sugerido_id: (coord as any).perfil_id || null,
                        is_coordinador: true,
                    }
                } catch (e) {
                    console.warn('Error intentando obtener usuario desde coordinador:', e)
                    return null
                }
            }
        } catch (e) {
            console.warn('Error verificando coordinadores para auth_user_id:', e)
        }

        // Si no existe usuario ni coordinador, retornar null (no bloquear importación ni gestión)
        return null
    } catch (error) {
        console.error('Error en obtenerUsuarioActual:', error)
        return null
    }
}

/**
 * Obtiene los perfiles asignados a un usuario
 */
export async function obtenerPerfilesUsuario(usuarioId: string) {
    try {
        const { data, error } = await supabase
            .from('usuario_perfil')
            .select(
                `
        *,
        perfiles:perfil_id (*)
      `
            )
            .eq('usuario_id', usuarioId)
            .eq('activo', true)

        if (error) {
            console.error('Error obteniendo perfiles:', error)
            return []
        }

        return data || []
    } catch (error) {
        console.error('Error en obtenerPerfilesUsuario:', error)
        return []
    }
}

/**
 * Obtiene los módulos accesibles para un usuario
 */
export async function obtenerModulosAccesibles(usuarioId: string) {
    try {
        const permisos = await obtenerPermisosUsuario(usuarioId)

        // Agrupar por módulo
        const modulosMap = new Map<string, any>()

        permisos.forEach((permiso) => {
            if (!modulosMap.has(permiso.modulo_nombre)) {
                modulosMap.set(permiso.modulo_nombre, {
                    nombre: permiso.modulo_nombre,
                    ruta: permiso.modulo_ruta,
                    permisos: [],
                })
            }

            modulosMap.get(permiso.modulo_nombre)?.permisos.push({
                codigo: permiso.permiso_codigo,
                nombre: permiso.permiso_nombre,
            })
        })

        return Array.from(modulosMap.values())
    } catch (error) {
        console.error('Error en obtenerModulosAccesibles:', error)
        return []
    }
}

/**
 * Verifica si el usuario puede acceder a una ruta específica
 */
export async function puedeAccederRuta(
    usuarioId: string,
    ruta: string
): Promise<boolean> {
    try {
        const modulos = await obtenerModulosAccesibles(usuarioId)
        return modulos.some((modulo) => modulo.ruta === ruta)
    } catch (error) {
        console.error('Error en puedeAccederRuta:', error)
        return false
    }
}

/**
 * Tipo de permiso para componentes
 */
export type PermisoComponente = {
    crear: boolean
    leer: boolean
    actualizar: boolean
    eliminar: boolean
    exportar: boolean
    importar: boolean
    aprobar: boolean
    administrar: boolean
}

/**
 * Obtiene los permisos CRUD de un usuario para un módulo específico
 */
export async function obtenerPermisosCRUD(
    usuarioId: string,
    moduloNombre: string
): Promise<PermisoComponente> {
    try {
        // Obtener los perfiles del usuario para verificar si es Super Admin
        const perfiles = await obtenerPerfilesUsuario(usuarioId)
        const esSuperAdmin = perfiles.some(
            (p: any) => p.perfiles && typeof p.perfiles.nombre === 'string' && p.perfiles.nombre.toLowerCase() === 'super admin'
        )

        if (esSuperAdmin) {
            // Retornar todos los permisos habilitados
            return {
                crear: true,
                leer: true,
                actualizar: true,
                eliminar: true,
                exportar: true,
                importar: true,
                aprobar: true,
                administrar: true,
            }
        }

        const permisos = await obtenerPermisosUsuario(usuarioId)
        const permisosModulo = permisos.filter(
            (p) => p.modulo_nombre === moduloNombre
        )

        return {
            crear: permisosModulo.some((p) => p.permiso_codigo === 'CREATE'),
            leer: permisosModulo.some((p) => p.permiso_codigo === 'READ'),
            actualizar: permisosModulo.some((p) => p.permiso_codigo === 'UPDATE'),
            eliminar: permisosModulo.some((p) => p.permiso_codigo === 'DELETE'),
            exportar: permisosModulo.some((p) => p.permiso_codigo === 'EXPORT'),
            importar: permisosModulo.some((p) => p.permiso_codigo === 'IMPORT'),
            aprobar: permisosModulo.some((p) => p.permiso_codigo === 'APPROVE'),
            administrar: permisosModulo.some((p) => p.permiso_codigo === 'ADMIN'),
        }
    } catch (error) {
        console.error('Error en obtenerPermisosCRUD:', error)
        return {
            crear: false,
            leer: false,
            actualizar: false,
            eliminar: false,
            exportar: false,
            importar: false,
            aprobar: false,
            administrar: false,
        }
    }
}
