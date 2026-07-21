import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { obtenerUsuarioActualServer } from '@/lib/supabase/usuario-actual-server'

// GET /api/visitas
// Super Admin: todos los militantes. Coordinador: solo los suyos
// (militantes.coordinador_id = su fila en coordinadores). Incluye la
// última visita registrada por militante y las actividades vigentes
// (para el selector de "tipo de reunión").
export async function GET(request: NextRequest) {
    try {
        const { esSuperAdmin, coordinadorId } = await obtenerUsuarioActualServer()

        if (!esSuperAdmin && !coordinadorId) {
            // Usuario logueado pero sin fila de coordinador ni Super Admin:
            // no tiene militantes asignados.
            return NextResponse.json({ militantes: [], actividades: [], esSuperAdmin: false })
        }

        const adminClient = createAdminClient()

        let militantesQuery = (adminClient as any)
            .from('militantes')
            .select(`
                id,
                usuario_id,
                coordinador_id,
                usuarios!militantes_usuario_id_fkey (nombres, apellidos, email, numero_documento, celular)
            `)
            .order('creado_en', { ascending: false })

        if (!esSuperAdmin) {
            militantesQuery = militantesQuery.eq('coordinador_id', coordinadorId)
        }

        const [{ data: militantesData, error: militantesError }, { data: actividadesData }] = await Promise.all([
            militantesQuery,
            (adminClient as any)
                .from('actividades')
                .select('id, nombre, estado')
                .eq('estado', 'vigente')
                .order('nombre', { ascending: true }),
        ])

        if (militantesError) {
            return NextResponse.json({ error: militantesError.message }, { status: 500 })
        }

        const militantes = (militantesData || []).map((m: any) => ({
            id: m.id,
            usuario_id: m.usuario_id,
            coordinador_id: m.coordinador_id,
            nombres: m.usuarios?.nombres || '',
            apellidos: m.usuarios?.apellidos || '',
            numero_documento: m.usuarios?.numero_documento || '',
            celular: m.usuarios?.celular || '',
            email: m.usuarios?.email || '',
        }))

        const militanteIds = militantes.map((m: any) => m.id)
        let visitasMap: Record<string, any> = {}

        if (militanteIds.length > 0) {
            const { data: visitasData } = await (adminClient as any)
                .from('agenda_visita')
                .select('*')
                .in('id_militante', militanteIds)
                .order('created_at', { ascending: false })

            ;(visitasData || []).forEach((v: any) => {
                if (!visitasMap[v.id_militante]) visitasMap[v.id_militante] = v
            })
        }

        const militantesConVisita = militantes.map((m: any) => ({
            ...m,
            visita_tipo: visitasMap[m.id]?.tipo_reunion || null,
            visita_estado: visitasMap[m.id]?.estado || null,
            visita_created_at: visitasMap[m.id]?.created_at || null,
        }))

        return NextResponse.json({
            militantes: militantesConVisita,
            actividades: actividadesData || [],
            esSuperAdmin,
        })
    } catch (error: any) {
        console.error('Error en GET /api/visitas:', error)
        return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
    }
}

// POST /api/visitas — registra una visita y, si se capturó geolocalización,
// actualiza usuarios.latitud/longitud del militante (dónde vive).
export async function POST(request: NextRequest) {
    try {
        const { esSuperAdmin, coordinadorId, authUserId } = await obtenerUsuarioActualServer()

        if (!authUserId) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }
        if (!esSuperAdmin && !coordinadorId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const body = await request.json()
        const { id_militante, tipo_reunion, observaciones, latitud, longitud } = body

        if (!id_militante || !tipo_reunion) {
            return NextResponse.json({ error: 'id_militante y tipo_reunion son requeridos' }, { status: 400 })
        }

        const adminClient = createAdminClient()

        // Verificar que el militante exista y (si no es Super Admin) que sea
        // realmente del coordinador logueado — evita que alguien registre
        // visitas de militantes ajenos manipulando el body del request.
        const { data: militante, error: militanteError } = await (adminClient as any)
            .from('militantes')
            .select('id, usuario_id, coordinador_id')
            .eq('id', id_militante)
            .single()

        if (militanteError || !militante) {
            return NextResponse.json({ error: 'Militante no encontrado' }, { status: 404 })
        }
        if (!esSuperAdmin && militante.coordinador_id !== coordinadorId) {
            return NextResponse.json({ error: 'Este militante no está asignado a tu usuario' }, { status: 403 })
        }

        const { data: visita, error: visitaError } = await (adminClient as any)
            .from('agenda_visita')
            .insert([{
                id_militante,
                estado: 'En espera',
                tipo_reunion,
                observaciones: observaciones || null,
                created_at: new Date().toISOString(),
            }])
            .select()
            .single()

        if (visitaError) {
            return NextResponse.json({ error: visitaError.message }, { status: 500 })
        }

        if (typeof latitud === 'number' && typeof longitud === 'number' && militante.usuario_id) {
            const { error: updateError } = await (adminClient as any)
                .from('usuarios')
                .update({ latitud, longitud })
                .eq('id', militante.usuario_id)

            if (updateError) {
                console.warn('No se pudo guardar la ubicación del militante:', updateError)
            }
        }

        return NextResponse.json({ visita })
    } catch (error: any) {
        console.error('Error en POST /api/visitas:', error)
        return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
    }
}
