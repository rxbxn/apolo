'use client'

import { useEffect, useState } from 'react'
import { useUsuario } from './use-usuario'
import { obtenerPerfilesUsuario } from '@/lib/supabase/permissions'

/**
 * Determina si el usuario actual tiene el perfil "Super Admin". Mismo
 * criterio ya usado en use-modulos-accesibles.ts y permissions.ts
 * (obtenerPermisosCRUD) — un perfil activo en usuario_perfil cuyo nombre,
 * en minúsculas, sea exactamente "super admin".
 *
 * Se centraliza acá para no repetir esta consulta en cada pantalla que
 * necesite reglas del tipo "solo Super Admin puede hacer X" (ej. activar
 * una persona creada por un coordinador).
 */
export function useEsSuperAdmin() {
    const { usuario, loading: loadingUsuario } = useUsuario()
    const [esSuperAdmin, setEsSuperAdmin] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelado = false

        async function verificar() {
            if (loadingUsuario) return

            if (!usuario) {
                if (!cancelado) {
                    setEsSuperAdmin(false)
                    setLoading(false)
                }
                return
            }

            setLoading(true)
            try {
                const perfiles = await obtenerPerfilesUsuario(usuario.id)
                const esAdmin = perfiles.some(
                    (p: any) =>
                        p.perfiles &&
                        typeof p.perfiles.nombre === 'string' &&
                        p.perfiles.nombre.toLowerCase() === 'super admin'
                )
                if (!cancelado) setEsSuperAdmin(esAdmin)
            } catch (error) {
                console.error('Error verificando Super Admin:', error)
                if (!cancelado) setEsSuperAdmin(false)
            } finally {
                if (!cancelado) setLoading(false)
            }
        }

        verificar()
        return () => {
            cancelado = true
        }
    }, [usuario, loadingUsuario])

    return { esSuperAdmin, loading }
}
