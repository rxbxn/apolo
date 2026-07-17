'use client'

import { useEffect, useState } from 'react'
import { useUsuario } from './use-usuario'
import { obtenerPerfilesUsuario, obtenerPermisosUsuario } from '@/lib/supabase/permissions'

/**
 * Determina a qué rutas de módulo tiene acceso el usuario actual según su
 * rol, para poder ocultar del menú lo que no le corresponde.
 *
 * Reglas:
 * - Super Admin: acceso total, sin restricción.
 * - Si el perfil del usuario todavía no tiene ninguna fila configurada en
 *   perfil_permiso_modulo (rol recién creado o el admin no lo ha configurado
 *   desde Gestión de Roles > Permisos por rol), NO se restringe — así el
 *   despliegue de esta función no oculta nada hasta que alguien lo configure
 *   explícitamente.
 * - En cuanto el rol tiene al menos un módulo configurado, el menú se limita
 *   exactamente a esos módulos.
 */
export function useModulosAccesibles() {
    const { usuario, loading: loadingUsuario } = useUsuario()
    const [rutas, setRutas] = useState<Set<string>>(new Set())
    const [sinRestriccion, setSinRestriccion] = useState(true)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelado = false

        async function cargar() {
            if (loadingUsuario) return

            if (!usuario) {
                if (!cancelado) {
                    setSinRestriccion(true)
                    setLoading(false)
                }
                return
            }

            setLoading(true)
            try {
                const perfilesUsuario = await obtenerPerfilesUsuario(usuario.id)
                const esSuperAdmin = perfilesUsuario.some(
                    (p: any) =>
                        p.perfiles &&
                        typeof p.perfiles.nombre === 'string' &&
                        p.perfiles.nombre.toLowerCase() === 'super admin'
                )

                if (esSuperAdmin) {
                    if (!cancelado) {
                        setSinRestriccion(true)
                        setRutas(new Set())
                    }
                    return
                }

                const permisos = await obtenerPermisosUsuario(usuario.id)

                if (!cancelado) {
                    if (!permisos || permisos.length === 0) {
                        // Nada configurado todavía para este rol: no bloquear.
                        setSinRestriccion(true)
                        setRutas(new Set())
                    } else {
                        setSinRestriccion(false)
                        const rutasSet = new Set<string>(
                            permisos
                                .map((p: any) => p.modulo_ruta)
                                .filter((r: any): r is string => !!r)
                        )
                        setRutas(rutasSet)
                    }
                }
            } catch (error) {
                console.error('Error cargando módulos accesibles:', error)
                if (!cancelado) {
                    // Ante un error no bloqueamos el acceso — mejor mostrar de
                    // más que dejar a alguien fuera de su propia app.
                    setSinRestriccion(true)
                    setRutas(new Set())
                }
            } finally {
                if (!cancelado) setLoading(false)
            }
        }

        cargar()
        return () => {
            cancelado = true
        }
    }, [usuario, loadingUsuario])

    function tieneAcceso(ruta: string): boolean {
        if (sinRestriccion) return true
        for (const r of rutas) {
            if (ruta === r || ruta.startsWith(r.endsWith('/') ? r : `${r}/`)) return true
        }
        return false
    }

    return { tieneAcceso, loading, sinRestriccion }
}
