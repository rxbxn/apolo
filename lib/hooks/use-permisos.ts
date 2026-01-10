'use client'

import { useEffect, useState } from 'react'
import { obtenerPermisosCRUD, type PermisoComponente } from '@/lib/supabase/permissions'
import { useUsuario } from './use-usuario'

export function usePermisos(moduloNombre: string) {
    const { usuario } = useUsuario()
    const [permisos, setPermisos] = useState<PermisoComponente | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function cargarPermisos() {
            if (!usuario) {
                setPermisos(null)
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                const permisosData = await obtenerPermisosCRUD(usuario.id, moduloNombre)
                setPermisos(permisosData)
            } catch (error) {
                console.error('Error cargando permisos:', error)
                setPermisos({
                    crear: false,
                    leer: false,
                    actualizar: false,
                    eliminar: false,
                    exportar: false,
                    importar: false,
                    aprobar: false,
                    administrar: false,
                })
            } finally {
                setLoading(false)
            }
        }

        cargarPermisos()
    }, [usuario, moduloNombre])

    return { permisos, loading }
}
