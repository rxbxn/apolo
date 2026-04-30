import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
    try {
        const adminClient = createAdminClient()
        const { searchParams } = new URL(request.url)
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '10'))
        const busqueda = (searchParams.get('busqueda') || '').trim()
        const estado = (searchParams.get('estado') || '').trim()
        const tipo = (searchParams.get('tipo') || '').trim()
        const coordinadorId = (searchParams.get('coordinador_id') || '').trim()

        // 1. Obtener los tipos de militante para mapeo
        const { data: tiposData, error: tiposError } = await (adminClient as any)
            .from('tipos_militante')
            .select('id, codigo, descripcion')

        if (tiposError) throw tiposError;

        // Función auxiliar para traer todos los registros esquivando el límite de 1000
        async function fetchAll(baseQuery: any) {
            let result: any[] = []
            let from = 0
            const pageSize = 1000
            while (true) {
                const { data, error } = await baseQuery.range(from, from + pageSize - 1)
                if (error) throw error
                if (!data || data.length === 0) break
                result = result.concat(data)
                if (data.length < pageSize) break
                from += pageSize
            }
            return result
        }

        // 2. Obtener coordinadores para excluir sus usuarios y evitar mostrar dirigentes/coordinadores
        const coordQuery = (adminClient as any)
            .from('coordinadores')
            .select('usuario_id')
            .not('usuario_id', 'is', null)

        let coordinadoresData: any[] = []
        try {
            coordinadoresData = await fetchAll(coordQuery)
        } catch (coordError: any) {
            console.error('Error obteniendo coordinadores:', coordError)
            return NextResponse.json({ error: coordError.message }, { status: 500 })
        }

        const coordinadorUsuarioIds = new Set((coordinadoresData || []).map((c: any) => c.usuario_id).filter(Boolean))

        // 3. Consultar militantes existentes sin paginación para poder combinar con virtuales correctamente
        let militantesQuery: any = (adminClient as any).from('militantes').select('*')
        if (estado) militantesQuery = militantesQuery.eq('estado', estado)
        if (tipo) militantesQuery = militantesQuery.eq('tipo', tipo)
        if (coordinadorId) militantesQuery = militantesQuery.eq('coordinador_id', coordinadorId)
        militantesQuery = militantesQuery.order('creado_en', { ascending: false })

        let militantesData: any[] = []
        try {
            militantesData = await fetchAll(militantesQuery)
        } catch (militantesError: any) {
            console.error('Error listando militantes desde tabla:', militantesError)
            return NextResponse.json({ error: militantesError.message }, { status: 500 })
        }

        // Todos los registros en militantes se muestran, incluyendo coordinadores/dirigentes
        // (CLAUDE.md: "Coordinadores y dirigentes aparecen en ambas tablas: coordinadores Y militantes")
        const militantesExistentes = (militantesData || []).map((m: any) => ({ ...m, is_virtual: false }))
        const militanteUsuarioIds = new Set(militantesExistentes.map((m: any) => m.usuario_id).filter(Boolean))

        // 4. Obtener usuarios activos que no tienen militante creado (virtuales)
        // No excluir coordinadores: todos son militantes per CLAUDE.md
        let usuariosQuery: any = (adminClient as any)
            .from('usuarios')
            .select('id, nombres, apellidos, numero_documento, tipo_documento, celular, email, compromiso_marketing, compromiso_cautivo, compromiso_impacto, estado, creado_en, actualizado_en')

        if (estado) {
            usuariosQuery = usuariosQuery.eq('estado', estado)
        } else {
            usuariosQuery = usuariosQuery.neq('estado', 'inactivo')
        }

        if (busqueda) {
            usuariosQuery = usuariosQuery.or(`nombres.ilike.%${busqueda}%,apellidos.ilike.%${busqueda}%,numero_documento.ilike.%${busqueda}%`)
        }

        let usuariosData: any[] = []
        try {
            usuariosData = await fetchAll(usuariosQuery)
        } catch (usuariosError: any) {
            console.error('Error obteniendo usuarios:', usuariosError)
            return NextResponse.json({ error: usuariosError.message }, { status: 500 })
        }

        // Construir mapa de usuarios para enriquecer militantes reales con nombres/docs
        const usuariosMapEarly = new Map((usuariosData || []).map((u: any) => [u.id, u]))

        // Virtuales: usuarios sin registro en militantes
        const usuariosMilitantes = (usuariosData || []).filter((u: any) => {
            return !militanteUsuarioIds.has(u.id) && !tipo && !coordinadorId
        })

        const virtualMilitantes = usuariosMilitantes.map((u: any) => ({
            id: `virtual-${u.id}`,
            usuario_id: u.id,
            tipo: null,
            coordinador_id: null,
            compromiso_marketing: u.compromiso_marketing,
            compromiso_cautivo: u.compromiso_cautivo,
            compromiso_impacto: u.compromiso_impacto,
            formulario: null,
            perfil_id: null,
            estado: u.estado || 'activo',
            creado_en: u.creado_en,
            actualizado_en: u.actualizado_en,
            is_virtual: true,
            nombres: u.nombres,
            apellidos: u.apellidos,
            numero_documento: u.numero_documento,
            tipo_documento: u.tipo_documento,
            celular: u.celular,
            usuario_email: u.email,
        }))

        // Enriquecer militantes reales con datos de usuario para poder buscar correctamente
        // Los campos nombres/apellidos/numero_documento no existen en la tabla militantes
        const militantesEnriquecidos = militantesExistentes.map((m: any) => {
            const u = usuariosMapEarly.get(m.usuario_id)
            if (u) {
                return {
                    ...m,
                    nombres: u.nombres,
                    apellidos: u.apellidos,
                    numero_documento: u.numero_documento,
                    tipo_documento: u.tipo_documento,
                    celular: u.celular,
                    usuario_email: u.email,
                }
            }
            return m
        })

        // 5. Combinar y ordenar
        let allMilitantes = [...militantesEnriquecidos, ...virtualMilitantes]
        allMilitantes.sort((a: any, b: any) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime())

        // Si hay búsqueda, aplicar a los registros combinados (ahora con nombres enriquecidos)
        const filteredMilitantes = busqueda
            ? allMilitantes.filter((m: any) => {
                const q = busqueda.toLowerCase()
                const nombres = (m.nombres || '').toLowerCase()
                const apellidos = (m.apellidos || '').toLowerCase()
                const numeroDocumento = (m.numero_documento || '').toLowerCase()
                return nombres.includes(q) || apellidos.includes(q) || numeroDocumento.includes(q)
            })
            : allMilitantes

        const totalCount = filteredMilitantes.length
        const pagFrom = (page - 1) * pageSize
        const pagTo = pagFrom + pageSize
        const paginatedMilitantes = filteredMilitantes.slice(pagFrom, pagTo)

        // 6. Recolectar ids para batch fetch (only for non-virtual militantes)
        const nonVirtualMilitantes = paginatedMilitantes.filter((m: any) => !m.is_virtual)
        const usuarioIds = Array.from(new Set(nonVirtualMilitantes.map((m: any) => m.usuario_id).filter(Boolean)))
        const perfilIds = Array.from(new Set(paginatedMilitantes.map((m: any) => m.perfil_id).filter(Boolean)))
        const coordinadorIds = Array.from(new Set(paginatedMilitantes.map((m: any) => m.coordinador_id).filter(Boolean)))

        const usuariosPromise = usuarioIds.length
            ? (adminClient as any).from('usuarios').select('id, nombres, apellidos, numero_documento, tipo_documento, celular, email').in('id', usuarioIds)
            : Promise.resolve({ data: [] })

        const perfilesPromise = perfilIds.length
            ? (adminClient as any).from('perfiles').select('id, nombre').in('id', perfilIds)
            : Promise.resolve({ data: [] })

        const coordinadoresPromise = coordinadorIds.length
            ? (adminClient as any).from('coordinadores').select('id, usuario_id').in('id', coordinadorIds)
            : Promise.resolve({ data: [] })

        const [usuariosRes, perfilesRes, coordinadoresRes] = await Promise.all([usuariosPromise, perfilesPromise, coordinadoresPromise])

        const usuariosList = usuariosRes?.data || []
        const perfilesList = perfilesRes?.data || []
        const coordinadoresList = coordinadoresRes?.data || []

        const usuariosMap = new Map((usuariosList || []).map((u: any) => [u.id, u]))
        const perfilesMap = new Map((perfilesList || []).map((p: any) => [p.id, p.nombre]))
        const coordinadorToUsuarioMap = new Map((coordinadoresList || []).map((c: any) => [c.id, c.usuario_id]))

        const coordUsuarioIds = Array.from(new Set((coordinadoresList || []).map((c: any) => c.usuario_id).filter(Boolean)))
        let coordUsuariosList: any[] = []
        if (coordUsuarioIds.length) {
            const { data: cuData, error: cuError } = await (adminClient as any)
                .from('usuarios')
                .select('id, nombres, apellidos')
                .in('id', coordUsuarioIds)
            if (cuError) {
                console.error('Error fetching coordinador usuario details:', cuError)
            }
            coordUsuariosList = cuData || []
        }

        const coordUsuarioMap = new Map((coordUsuariosList || []).map((u: any) => [u.id, u]))

        const augmentedData = paginatedMilitantes.map((m: any) => {
            const usuarioAny: any = m.is_virtual ? {
                nombres: m.nombres,
                apellidos: m.apellidos,
                numero_documento: m.numero_documento,
                tipo_documento: m.tipo_documento,
                celular: m.celular,
                email: m.usuario_email,
            } : usuariosMap.get(m.usuario_id) || null

            const perfilNombre = m.perfil_id ? perfilesMap.get(m.perfil_id) : null
            const coordUsuarioId = m.coordinador_id ? coordinadorToUsuarioMap.get(m.coordinador_id) : null
            const coordUsuarioAny: any = coordUsuarioId ? coordUsuarioMap.get(coordUsuarioId) : null

            const rawTipo = m.tipo
            let tipo_descripcion = null
            let tipo_codigo = null
            if (rawTipo !== undefined && rawTipo !== null) {
                const byId = tiposData && tiposData.find((t: any) => String(t.id) === String(rawTipo))
                const byCodigo = tiposData && tiposData.find((t: any) => String(t.codigo) === String(rawTipo))
                if (byId) {
                    tipo_descripcion = byId.descripcion
                    tipo_codigo = byId.codigo
                } else if (byCodigo) {
                    tipo_descripcion = byCodigo.descripcion
                    tipo_codigo = byCodigo.codigo
                } else {
                    tipo_descripcion = m.tipo
                    tipo_codigo = String(m.tipo)
                }
            }

            return {
                ...m,
                militante_id: m.id,
                nombres: usuarioAny ? usuarioAny.nombres : null,
                apellidos: usuarioAny ? usuarioAny.apellidos : null,
                numero_documento: usuarioAny ? usuarioAny.numero_documento : null,
                tipo_documento: usuarioAny ? usuarioAny.tipo_documento : null,
                celular: usuarioAny ? usuarioAny.celular : null,
                usuario_email: usuarioAny ? usuarioAny.email : null,
                coordinador_nombre: coordUsuarioAny ? `${coordUsuarioAny.nombres} ${coordUsuarioAny.apellidos}` : null,
                perfil_nombre: perfilNombre || null,
                tipo_descripcion,
                tipo_codigo,
            }
        })

        return NextResponse.json({
            data: augmentedData,
            count: totalCount,
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize),
        })
    } catch (error: any) {
        console.error('Error en GET /api/militante:', error)
        return NextResponse.json({ error: `Error interno del servidor: ${error.message || error}` }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const adminClient = createAdminClient()
        const body = await request.json()

        let { usuario_id, tipo, coordinador_id, compromiso_marketing, compromiso_cautivo, compromiso_impacto, compromiso_difusion, compromiso_proyecto, formulario, perfil_id } = body

        // Validaciones básicas
        if (!usuario_id || !tipo) {
            return NextResponse.json({ 
                error: 'Faltan campos requeridos: usuario_id y tipo son obligatorios' 
            }, { status: 400 })
        }

        // Validar formato UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(usuario_id)) {
            return NextResponse.json({ 
                error: `usuario_id no tiene formato UUID válido: ${usuario_id}` 
            }, { status: 400 })
        }

        // Sanitización de campos UUID vacíos
        if (perfil_id === "") perfil_id = null;
        if (coordinador_id === "") coordinador_id = null;

        // Verificar que el usuario existe
        const { data: usuario, error: usuarioError } = await (adminClient as any)
            .from('usuarios')
            .select('id, nombres, apellidos')
            .eq('id', usuario_id)
            .single()

        if (usuarioError || !usuario) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
        }

        // Verificar coordinador si se proporciona
        if (coordinador_id) {
            if (!uuidRegex.test(coordinador_id)) {
                return NextResponse.json({ 
                    error: `coordinador_id no tiene formato UUID válido: ${coordinador_id}` 
                }, { status: 400 })
            }

            const { data: coordinador, error: coordError } = await (adminClient as any)
                .from('coordinadores')
                .select('id')
                .eq('id', coordinador_id)
                .single()

            if (coordError || !coordinador) {
                return NextResponse.json({ error: 'Coordinador no encontrado' }, { status: 404 })
            }
        }

        // Crear militante
        const insertPayload: any = {
            usuario_id,
            tipo,
            compromiso_marketing: compromiso_marketing === "" ? null : (compromiso_marketing ?? null),
            compromiso_cautivo: compromiso_cautivo === "" ? null : (compromiso_cautivo ?? null),
            compromiso_impacto: compromiso_impacto === "" ? null : (compromiso_impacto ?? null),
            compromiso_difusion: compromiso_difusion === "" ? null : (compromiso_difusion ?? null),
            compromiso_proyecto: compromiso_proyecto === "" ? null : (compromiso_proyecto ?? null),
            formulario: formulario === "" ? null : (formulario ?? null),
        }
        if (coordinador_id) insertPayload.coordinador_id = coordinador_id
        if (perfil_id) insertPayload.perfil_id = perfil_id

        const { data: militanteInsertRes, error: militanteError } = await (adminClient as any)
            .from('militantes')
            .insert(insertPayload)
            .select() // Add select to get back the created record
        const militante = (militanteInsertRes && Array.isArray(militanteInsertRes) && militanteInsertRes[0]) ? militanteInsertRes[0] : (militanteInsertRes || null)

        if (militanteError) {
            console.error('Error creando militante:', militanteError)
            return NextResponse.json({ error: militanteError.message }, { status: 500 })
        }

        // Try to sync usuarios with compromiso fields.
        try {
            if (usuario_id) {
                await (adminClient as any)
                    .from('usuarios')
                    .update({
                    compromiso_marketing: (compromiso_marketing === "" || compromiso_marketing == null) ? null : Number(compromiso_marketing),
                    compromiso_cautivo: (compromiso_cautivo === "" || compromiso_cautivo == null) ? null : Number(compromiso_cautivo),
                    compromiso_impacto: (compromiso_impacto === "" || compromiso_impacto == null) ? null : Number(compromiso_impacto),
                    })
                    .eq('id', usuario_id)
            }
        } catch (syncErr) {
            console.error('Exception synchronizing usuario after creating militante:', syncErr)
            // Not a breaking error for militante creation
        }

        return NextResponse.json(militante, { status: 201 })
    } catch (error: any) {
        console.error('Error en POST /api/militante:', error)
        return NextResponse.json({ error: `Error interno del servidor: ${error.message || error}` }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const adminClient = createAdminClient()
        const body = await request.json()

        const { id, usuario_id, tipo, coordinador_id, dirigente_id, compromiso_marketing, compromiso_cautivo, compromiso_impacto, compromiso_difusion, compromiso_proyecto, formulario, perfil_id, estado } = body

        // Validate id (if provided)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        
        // Try to find existing militant
        let existingMilitante = null
        let militanteId = id

        if (militanteId && uuidRegex.test(militanteId)) {
            const { data } = await (adminClient as any).from('militantes').select('*').eq('id', militanteId).single()
            existingMilitante = data
        }

        // If not found by id, try by usuario_id
        if (!existingMilitante && usuario_id && uuidRegex.test(usuario_id)) {
            const { data } = await (adminClient as any).from('militantes').select('*').eq('usuario_id', usuario_id).single()
            if (data) {
                existingMilitante = data
                militanteId = data.id
            }
        }

        const updatePayload: any = {}
        if (tipo !== undefined) updatePayload.tipo = tipo
        if (coordinador_id !== undefined) updatePayload.coordinador_id = coordinador_id || null
        if (dirigente_id !== undefined) updatePayload.dirigente_id = dirigente_id || null
        if (compromiso_marketing !== undefined) updatePayload.compromiso_marketing = compromiso_marketing === "" ? null : compromiso_marketing
        if (compromiso_cautivo !== undefined) updatePayload.compromiso_cautivo = compromiso_cautivo === "" ? null : compromiso_cautivo
        if (compromiso_impacto !== undefined) updatePayload.compromiso_impacto = compromiso_impacto === "" ? null : compromiso_impacto
        if (compromiso_difusion !== undefined) updatePayload.compromiso_difusion = compromiso_difusion === "" ? null : compromiso_difusion
        if (compromiso_proyecto !== undefined) updatePayload.compromiso_proyecto = compromiso_proyecto === "" ? null : compromiso_proyecto
        if (formulario !== undefined) updatePayload.formulario = formulario === "" ? null : formulario
        if (perfil_id !== undefined) updatePayload.perfil_id = perfil_id || null
        if (estado !== undefined) updatePayload.estado = estado

        let resultData = null

        if (existingMilitante) {
            // Update
            const { data, error: updateErr } = await (adminClient as any)
                .from('militantes')
                .update(updatePayload)
                .eq('id', militanteId)
                .select()
                .single()
            
            if (updateErr) {
                console.error('Error actualizando militante:', updateErr)
                return NextResponse.json({ error: 'Error actualizando militante' }, { status: 500 })
            }
            resultData = data
        } else {
            // Create (Upsert case)
            if (!usuario_id || !tipo) {
                return NextResponse.json({ error: 'Militante no encontrado y faltan datos para crear uno nuevo (usuario_id y tipo)' }, { status: 404 })
            }
            
            const insertPayload = {
                ...updatePayload,
                usuario_id,
                tipo: tipo || 'Sin tipo',
                estado: estado || 'activo'
            }
            
            const { data, error: insertErr } = await (adminClient as any)
                .from('militantes')
                .insert(insertPayload)
                .select()
                .single()

            if (insertErr) {
                console.error('Error creando militante en PATCH:', insertErr)
                return NextResponse.json({ error: 'Error creando militante' }, { status: 500 })
            }
            resultData = data
        }

        // Sync usuario fields
        try {
            const finalUsuarioId = usuario_id || (resultData as any).usuario_id
            if (finalUsuarioId) {
                const { error: userUpdateErr } = await (adminClient as any).from('usuarios').update({
                    compromiso_marketing: (compromiso_marketing === "" || compromiso_marketing == null) ? null : Number(compromiso_marketing),
                    compromiso_cautivo: (compromiso_cautivo === "" || compromiso_cautivo == null) ? null : Number(compromiso_cautivo),
                    compromiso_impacto: (compromiso_impacto === "" || compromiso_impacto == null) ? null : Number(compromiso_impacto),
                }).eq('id', finalUsuarioId)

                if (userUpdateErr) {
                    console.error('Error sincronizando usuario tras salvar militante:', userUpdateErr)
                    // We don't rollback here to avoid complex state, but we log the error
                }
            }
        } catch (syncErr) {
            console.error('Exception synchronizing usuario after saving militante:', syncErr)
        }

        return NextResponse.json(resultData)
    } catch (error: any) {
        console.error('Error en PATCH /api/militante:', error)
        return NextResponse.json({ error: `Error interno del servidor: ${error.message || error}` }, { status: 500 })
    }
}
