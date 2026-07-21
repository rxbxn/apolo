import { createClient } from './server'
import { cookies } from 'next/headers'

export interface UsuarioActualServer {
    authUserId: string | null
    usuarioId: string | null
    coordinadorId: string | null
    esSuperAdmin: boolean
}

// Resuelve, en el servidor (Server Action / Route Handler), quién es el
// usuario logueado a partir de la sesión (cookies): su fila en `usuarios`,
// su fila en `coordinadores` (si aplica) y si su perfil es "Super Admin".
// No existía un helper así reutilizable — cada endpoint resolvía esto a
// mano. Útil para decidir en el backend (no solo en el cliente) si un
// endpoint debe devolver TODO o solo lo que le corresponde al usuario.
export async function obtenerUsuarioActualServer(): Promise<UsuarioActualServer> {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { authUserId: null, usuarioId: null, coordinadorId: null, esSuperAdmin: false }
    }

    let usuarioId: string | null = null
    let coordinadorId: string | null = null

    const { data: coordinador } = await supabase
        .from('coordinadores')
        .select('id, usuario_id')
        .eq('auth_user_id', user.id)
        .eq('estado', 'activo')
        .maybeSingle()

    if (coordinador) {
        coordinadorId = (coordinador as any).id
        usuarioId = (coordinador as any).usuario_id
    } else {
        const { data: usuario } = await supabase
            .from('usuarios')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle()
        usuarioId = (usuario as any)?.id ?? null
    }

    let esSuperAdmin = false

    if (usuarioId) {
        const { data: usuarioPerfiles } = await supabase
            .from('usuario_perfil')
            .select('perfiles:perfil_id(nombre)')
            .eq('usuario_id', usuarioId)
            .eq('activo', true)

        esSuperAdmin = (usuarioPerfiles || []).some((up: any) => {
            const perfilInfo = Array.isArray(up.perfiles) ? up.perfiles[0] : up.perfiles
            return typeof perfilInfo?.nombre === 'string' && perfilInfo.nombre.toLowerCase() === 'super admin'
        })
    }

    return { authUserId: user.id, usuarioId, coordinadorId, esSuperAdmin }
}
