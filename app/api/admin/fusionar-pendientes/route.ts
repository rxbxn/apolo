import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { qEmail } from '@/lib/personas/import-utils'

// POST /api/admin/fusionar-pendientes
// Limpieza de un problema real que produjo el import: cuando alguien
// aparece como COORDINADOR/DIRIGENTE de otros pero no se le encontraba
// todavía una fila de coordinador, se le creaba un usuario placeholder
// (numero_documento tipo "PENDIENTE-xxxxxxxx") — incluso si esa MISMA
// persona ya tenía su propia fila real (con cédula) en otra parte del
// Excel, importada como militante normal. import-lote/route.ts ya no repite
// este error (revisa primero si existe una persona real con ese nombre),
// pero esto limpia los duplicados que ya quedaron en la base de imports
// anteriores.
//
// Para cada coordinador cuyo usuario es un placeholder, busca una persona
// real (misma cédula real, no PENDIENTE-*) con el nombre EXACTO:
//   - Si el usuario real todavía no tiene su propia fila de coordinador:
//     simplemente se repunta coordinadores.usuario_id al usuario real y se
//     borra el usuario placeholder. El id del coordinador no cambia, así
//     que militantes.coordinador_id/dirigente_id y dirigentes.id_coordinador
//     /id_dirigente (que apuntan a ese id) siguen funcionando sin tocarlos.
//   - Si el usuario real YA tiene su propio coordinador (quedaron los dos
//     duplicados): se redirige todo lo que apuntaba al coordinador
//     placeholder hacia el coordinador real, y se borran el coordinador y
//     el usuario placeholder.
export async function POST() {
    const adminClient = createAdminClient() as any

    const [{ data: coords, error: errCoords }, { data: usuarios, error: errUsuarios }] = await Promise.all([
        adminClient.from('coordinadores').select('id, usuario_id'),
        adminClient.from('usuarios').select('id, nombres, apellidos, numero_documento, email'),
    ])
    if (errCoords) return NextResponse.json({ error: errCoords.message }, { status: 500 })
    if (errUsuarios) return NextResponse.json({ error: errUsuarios.message }, { status: 500 })

    const usuarioById = new Map<string, any>((usuarios ?? []).map((u: any) => [u.id, u]))
    const coordinadorPorUsuarioId = new Map<string, string>((coords ?? []).map((c: any) => [c.usuario_id, c.id]))

    const usuarioRealPorNombre = new Map<string, any>()
    ;(usuarios ?? []).forEach((u: any) => {
        if (String(u.numero_documento || '').startsWith('PENDIENTE-')) return
        const key = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim().toUpperCase()
        if (key) usuarioRealPorNombre.set(key, u)
    })

    const placeholders = (coords ?? []).filter((c: any) => {
        const u = usuarioById.get(c.usuario_id)
        return u && String(u.numero_documento || '').startsWith('PENDIENTE-')
    })

    const fusiones: { nombre: string; accion: string; coordinador_id: string }[] = []
    const errores: string[] = []
    const sinMatch: string[] = []

    for (const placeholder of placeholders) {
        const uPlaceholder = usuarioById.get(placeholder.usuario_id)
        const key = `${uPlaceholder?.nombres ?? ''} ${uPlaceholder?.apellidos ?? ''}`.trim().toUpperCase()
        const real = usuarioRealPorNombre.get(key)

        if (!real) {
            sinMatch.push(key)
            continue
        }

        const coordinadorRealId = coordinadorPorUsuarioId.get(real.id)

        if (!coordinadorRealId) {
            // Caso simple: el coordinador placeholder pasa a apuntar al
            // usuario real (mismo coordinador.id, nada más se toca).
            const { error: errUpdate } = await adminClient
                .from('coordinadores')
                .update({ usuario_id: real.id, email: qEmail(real.email) || undefined })
                .eq('id', placeholder.id)

            if (errUpdate) {
                errores.push(`${key}: ${errUpdate.message}`)
                continue
            }

            const { error: errDelete } = await adminClient.from('usuarios').delete().eq('id', uPlaceholder.id)
            if (errDelete) errores.push(`${key}: coordinador repuntado pero no se pudo borrar el usuario placeholder: ${errDelete.message}`)

            fusiones.push({ nombre: key, accion: 'repuntado_a_usuario_real', coordinador_id: placeholder.id })
        } else {
            // Caso doble: ya había un coordinador real aparte — fusionar
            // ambos, redirigiendo todo lo que apuntaba al placeholder.
            const resultados = await Promise.all([
                adminClient.from('militantes').update({ coordinador_id: coordinadorRealId }).eq('coordinador_id', placeholder.id),
                adminClient.from('militantes').update({ dirigente_id: coordinadorRealId }).eq('dirigente_id', placeholder.id),
                adminClient.from('dirigentes').update({ id_coordinador: coordinadorRealId }).eq('id_coordinador', placeholder.id),
                adminClient.from('dirigentes').update({ id_dirigente: coordinadorRealId }).eq('id_dirigente', placeholder.id),
            ])
            const errRedirect = resultados.find((r: any) => r.error)
            if (errRedirect) {
                errores.push(`${key}: error redirigiendo referencias — ${errRedirect.error.message}`)
                continue
            }

            const { error: errDelCoord } = await adminClient.from('coordinadores').delete().eq('id', placeholder.id)
            if (errDelCoord) { errores.push(`${key}: ${errDelCoord.message}`); continue }

            const { error: errDelUsuario } = await adminClient.from('usuarios').delete().eq('id', uPlaceholder.id)
            if (errDelUsuario) errores.push(`${key}: coordinador fusionado pero no se pudo borrar el usuario placeholder: ${errDelUsuario.message}`)

            fusiones.push({ nombre: key, accion: 'fusionado_con_coordinador_existente', coordinador_id: coordinadorRealId })
        }
    }

    return NextResponse.json({
        totalPlaceholders: placeholders.length,
        fusionados: fusiones.length,
        sinMatch: sinMatch.length,
        fusiones,
        errores,
        ok: errores.length === 0,
    })
}
