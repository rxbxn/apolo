import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const adminClient = createAdminClient()
        const { searchParams } = new URL(request.url)

        const page      = Math.max(1, parseInt(searchParams.get('page')     || '1'))
        const pageSize  = Math.max(1, parseInt(searchParams.get('pageSize') || '10'))
        const busqueda  = (searchParams.get('busqueda')       || '').trim()
        const estado    = (searchParams.get('estado')         || '').trim()
        const ciudad_id = (searchParams.get('ciudad_id')      || '').trim()
        const tipoFilt  = (searchParams.get('tipo_militante') || '').trim()

        const from = (page - 1) * pageSize
        const to   = from + pageSize - 1

        // ─────────────────────────────────────────────────────────────────
        // CASO A: Sin filtro de tipo → paginación directa (count correcto)
        // ─────────────────────────────────────────────────────────────────
        if (!tipoFilt || tipoFilt === 'todos') {
            let query = (adminClient as any)
                .from('usuarios')
                .select(`
                    *, comp_proyecto,
                    ciudades(nombre),
                    militantes!usuario_id(
                        id, coordinador_id,
                        compromiso_marketing, compromiso_cautivo,
                        compromiso_impacto, compromiso_difusion, compromiso_proyecto
                    ),
                    coordinadores!usuario_id(
                        id, perfil_id, perfiles(nombre, nivel_jerarquico)
                    )
                `, { count: 'exact' })

            if (busqueda)  query = query.or(`nombres.ilike.%${busqueda}%,apellidos.ilike.%${busqueda}%,numero_documento.ilike.%${busqueda}%`)
            if (estado)    query = query.eq('estado', estado)
            if (ciudad_id) query = query.eq('ciudad_id', ciudad_id)
            query = query.range(from, to).order('creado_en', { ascending: false })

            const { data: rows, error, count } = await query
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })

            const enriched = await enriquecerFilas(adminClient, rows ?? [])
            return NextResponse.json({ data: enriched, count: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) })
        }

        // ─────────────────────────────────────────────────────────────────
        // CASO B: Con filtro de tipo → estrategia de IDs en memoria
        // Nunca se mandan listas grandes en URL. Todo se filtra en Node.js.
        // ─────────────────────────────────────────────────────────────────

        // Paso B-1: Cargar coordinadores con su perfil (una sola query, ~200 filas)
        const { data: coordRows } = await (adminClient as any)
            .from('coordinadores')
            .select('usuario_id, perfil_id')

        const allCoordRows = (coordRows ?? []) as any[]

        // Determinar qué usuario_ids incluir o excluir
        let includeIdSet: Set<string> | null = null  // null = todos
        let excludeIdSet: Set<string> | null = null

        const perfilNombreMap: Record<string, string> = {
            'coordinador_zona':      'Coordinador de Zona',
            'coordinador_local':     'Coordinador Local',
            'coordinador_municipal': 'Coordinador Municipal',
            'dirigente':             'Dirigente',
        }

        if (tipoFilt === 'militante') {
            // Excluir usuarios que están en coordinadores
            excludeIdSet = new Set(allCoordRows.map((c: any) => c.usuario_id).filter(Boolean))
        } else {
            const perfilNombre = perfilNombreMap[tipoFilt]
            if (!perfilNombre) {
                return NextResponse.json({ data: [], count: 0, page, pageSize, totalPages: 0 })
            }
            // Buscar id del perfil (case-insensitive)
            const { data: perfilData } = await (adminClient as any)
                .from('perfiles')
                .select('id')
                .ilike('nombre', perfilNombre)
                .limit(1)
                .maybeSingle()

            if (!perfilData) {
                return NextResponse.json({ data: [], count: 0, page, pageSize, totalPages: 0 })
            }
            // Solo coordinadores con ese perfil
            const perfil_id = (perfilData as any).id
            includeIdSet = new Set(
                allCoordRows
                    .filter((c: any) => c.perfil_id === perfil_id)
                    .map((c: any) => c.usuario_id)
                    .filter(Boolean)
            )
            if (includeIdSet.size === 0) {
                return NextResponse.json({ data: [], count: 0, page, pageSize, totalPages: 0 })
            }
        }

        // Paso B-2: Obtener SOLO IDs de usuarios que cumplen busqueda/estado/ciudad
        // (query ligera, sin datos extra, sin límite de paginación)
        let idQuery = (adminClient as any)
            .from('usuarios')
            .select('id, creado_en')

        if (busqueda)  idQuery = idQuery.or(`nombres.ilike.%${busqueda}%,apellidos.ilike.%${busqueda}%,numero_documento.ilike.%${busqueda}%`)
        if (estado)    idQuery = idQuery.eq('estado', estado)
        if (ciudad_id) idQuery = idQuery.eq('ciudad_id', ciudad_id)
        idQuery = idQuery.order('creado_en', { ascending: false })

        const { data: allIdRows, error: idErr } = await idQuery
        if (idErr) return NextResponse.json({ error: idErr.message }, { status: 500 })

        // Paso B-3: Filtrar por tipo en memoria (sin tocar URLs)
        let filteredIdRows = ((allIdRows ?? []) as any[]).filter((u: any) => {
            if (excludeIdSet !== null) return !excludeIdSet.has(u.id)
            if (includeIdSet !== null) return includeIdSet.has(u.id)
            return true
        })

        const totalCount = filteredIdRows.length
        if (totalCount === 0) {
            return NextResponse.json({ data: [], count: 0, page, pageSize, totalPages: 0 })
        }

        // Paso B-4: Paginar en memoria, obtener solo los IDs de esta página
        const pageIdRows = filteredIdRows.slice(from, to + 1)
        const pageIds    = pageIdRows.map((u: any) => u.id)

        if (pageIds.length === 0) {
            return NextResponse.json({ data: [], count: totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) })
        }

        // Paso B-5: Fetch completo SOLO para los 10 IDs de la página (IN con 10 elementos → URL corta)
        const { data: rows, error: dataErr } = await (adminClient as any)
            .from('usuarios')
            .select(`
                *, comp_proyecto,
                ciudades(nombre),
                militantes!usuario_id(
                    id, coordinador_id,
                    compromiso_marketing, compromiso_cautivo,
                    compromiso_impacto, compromiso_difusion, compromiso_proyecto
                ),
                coordinadores!usuario_id(
                    id, perfil_id, perfiles(nombre, nivel_jerarquico)
                )
            `)
            .in('id', pageIds)
            .order('creado_en', { ascending: false })

        if (dataErr) return NextResponse.json({ error: dataErr.message }, { status: 500 })

        const enriched = await enriquecerFilas(adminClient, rows ?? [])
        return NextResponse.json({
            data:       enriched,
            count:      totalCount,
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize),
        })

    } catch (error: any) {
        console.error('Error en GET /api/personas:', error)
        return NextResponse.json({ error: `Error interno: ${error.message}` }, { status: 500 })
    }
}

// ── Helper: enriquecer filas con nombre del coordinador asignado ──────────
async function enriquecerFilas(adminClient: any, rows: any[]) {
    const coordIds = [
        ...new Set(
            rows
                .flatMap((u: any) => (u.militantes ?? []).map((m: any) => m.coordinador_id))
                .filter(Boolean)
        ),
    ] as string[]

    const coordNombres: Record<string, string> = {}
    if (coordIds.length > 0) {
        const { data: cData, error: cError } = await adminClient
            .from('coordinadores')
            .select('id, usuarios!coordinadores_usuario_id_fkey(nombres, apellidos)')
            .in('id', coordIds)

        if (cError) {
            console.error('Error resolviendo nombres de coordinador (embed ambiguo?):', cError)
        }
        ;(cData ?? []).forEach((c: any) => {
            const u = c.usuarios
            if (u) coordNombres[c.id] = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim()
        })
    }

    return rows.map((u: any) => {
        const mil           = (u.militantes    ?? [])[0] ?? null
        const coord         = (u.coordinadores ?? [])[0] ?? null
        const perfil_nombre = coord?.perfiles?.nombre ?? null
        const coord_nombre  = mil?.coordinador_id ? (coordNombres[mil.coordinador_id] ?? null) : null
        return {
            ...u,
            _militante:     mil,
            _perfil_nombre: perfil_nombre,
            _coord_nombre:  coord_nombre,
        }
    })
}
