import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
    try {
        // Usar adminClient para evitar problemas con RLS
        const adminClient = createAdminClient()

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '10')
        const busqueda = searchParams.get('busqueda') || ''
        const estado = searchParams.get('estado') || ''

        // 1. Obtener los tipos de militante para mapeo
        const { data: tiposData, error: tiposError } = await (adminClient as any)
            .from('tipos_militante')
            .select('id, codigo, descripcion')

        if (tiposError) throw tiposError;

        // Build maps by codigo and by id to handle cases where 'tipo' stores either the code or the UUID
        const tiposMapByCodigo = new Map((tiposData || []).map((t: any) => [String(t.codigo), t.descripcion]));
        const tiposMapById = new Map((tiposData || []).map((t: any) => [(t.id as string), t.descripcion]));

        // 2. Consultar militantes directamente (sin selects relacionales)
        let tableQuery = (adminClient as any)
            .from('militantes')
            .select('*', { count: 'exact' })

        if (estado) {
            tableQuery = tableQuery.eq('estado', estado)
        }

        // Paginación
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        tableQuery = tableQuery.range(from, to).order('creado_en', { ascending: false })

        const { data, error: tableError, count } = await tableQuery

        if (tableError) {
            console.error('Error listando militantes desde tabla:', tableError)
            return NextResponse.json({ error: tableError.message }, { status: 500 })
        }

        const militantes = data || []

        // 3. Recolectar ids para batch fetch
        const usuarioIds = Array.from(new Set(militantes.map((m: any) => m.usuario_id).filter(Boolean)))
        const perfilIds = Array.from(new Set(militantes.map((m: any) => m.perfil_id).filter(Boolean)))
        const coordinadorIds = Array.from(new Set(militantes.map((m: any) => m.coordinador_id).filter(Boolean)))

        // 4. Batch fetch related tables
        const usuariosPromise = usuarioIds.length
            ? (adminClient as any).from('usuarios').select('id, nombres, apellidos, numero_documento').in('id', usuarioIds)
            : Promise.resolve({ data: [] })

        const perfilesPromise = perfilIds.length
            ? (adminClient as any).from('perfiles').select('id, nombre').in('id', perfilIds)
            : Promise.resolve({ data: [] })

        // For coordinadores we fetch coordinadores then their usuarios
        const coordinadoresPromise = coordinadorIds.length
            ? (adminClient as any).from('coordinadores').select('id, usuario_id').in('id', coordinadorIds)
            : Promise.resolve({ data: [] })

        const [usuariosRes, perfilesRes, coordinadoresRes] = await Promise.all([usuariosPromise, perfilesPromise, coordinadoresPromise])

        const usuariosList = usuariosRes?.data || []
        const perfilesList = perfilesRes?.data || []
        const coordinadoresList = coordinadoresRes?.data || []

        const usuariosMap = new Map((usuariosList || []).map((u: any) => [u.id, u]))
        const perfilesMap = new Map((perfilesList || []).map((p: any) => [p.id, p.nombre]))

        // Map coordinador.id -> usuario_id
        const coordUsuarioIds = Array.from(new Set((coordinadoresList || []).map((c: any) => c.usuario_id).filter(Boolean)))
        let coordUsuariosList: any[] = []
        if (coordUsuarioIds.length) {
            const { data: cuData } = await (adminClient as any).from('usuarios').select('id, nombres, apellidos').in('id', coordUsuarioIds)
            coordUsuariosList = cuData || []
        }
        const coordUsuarioMap = new Map((coordUsuariosList || []).map((u: any) => [u.id, u]))
        const coordinadorToUsuarioMap = new Map((coordinadoresList || []).map((c: any) => [c.id, c.usuario_id]))

        // 5. Mapear resultados
        const augmentedData = (militantes || []).map((m: any) => {
            const usuarioAny: any = usuariosMap.get(m.usuario_id) || null
            const perfilNombre = m.perfil_id ? perfilesMap.get(m.perfil_id) : null
            const coordUsuarioId = coordinadorToUsuarioMap.get(m.coordinador_id)
            const coordUsuarioAny: any = coordUsuarioId ? coordUsuarioMap.get(coordUsuarioId) : null
            // Resolve tipo by id or codigo
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
                coordinador_nombre: coordUsuarioAny ? `${coordUsuarioAny.nombres} ${coordUsuarioAny.apellidos}` : null,
                perfil_nombre: perfilNombre || null,
                tipo_descripcion,
                tipo_codigo,
            }
        })

        // Optional client-side filter by busqueda (search across nombres/apellidos/numero_documento)
        const filtered = busqueda
            ? augmentedData.filter((r: any) => {
                const q = busqueda.toLowerCase()
                return (r.nombres || '').toLowerCase().includes(q) || (r.apellidos || '').toLowerCase().includes(q) || (r.numero_documento || '').toLowerCase().includes(q)
            })
            : augmentedData

        return NextResponse.json({
            data: filtered,
            count,
            page,
            pageSize,
            totalPages: Math.ceil((count || 0) / pageSize),
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

        let { usuario_id, tipo, coordinador_id, compromiso_marketing, compromiso_cautivo, compromiso_impacto, formulario, perfil_id } = body

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
            compromiso_marketing: compromiso_marketing ?? null,
            compromiso_cautivo: compromiso_cautivo ?? null,
            compromiso_impacto: compromiso_impacto ?? null,
            formulario: formulario ?? null,
        }
        if (coordinador_id) insertPayload.coordinador_id = coordinador_id
        if (perfil_id) insertPayload.perfil_id = perfil_id

        const { data: militanteInsertRes, error: militanteError } = await (adminClient as any)
            .from('militantes')
            .insert(insertPayload)
        const militante = (militanteInsertRes && Array.isArray(militanteInsertRes) && militanteInsertRes[0]) ? militanteInsertRes[0] : null

        if (militanteError) {
            console.error('Error creando militante:', militanteError)
            return NextResponse.json({ error: militanteError.message }, { status: 500 })
        }

        // Try to sync usuarios with compromiso fields. If this fails, remove the created militante (rollback)
        try {
            if (usuario_id) {
                const { data: userUpdate, error: userUpdateErr } = await (adminClient as any)
                    .from('usuarios')
                    .update({
                        compromiso_marketing: compromiso_marketing ?? null,
                        compromiso_cautivo: compromiso_cautivo ?? null,
                        compromiso_impacto: compromiso_impacto ?? null,
                    })
                    .eq('id', usuario_id)

                if (userUpdateErr) {
                    // Rollback: delete the created militante
                    try {
                        if (militante && (militante as any).id) {
                            await (adminClient as any).from('militantes').delete().eq('id', (militante as any).id)
                        }
                    } catch (delErr) {
                        console.error('Error cleaning up militante after usuario sync failure:', delErr)
                    }
                    console.error('Error actualizando usuario tras crear militante:', userUpdateErr)
                    return NextResponse.json({ error: 'Error sincronizando usuario tras crear militante' }, { status: 500 })
                }
            }
        } catch (syncErr) {
            // Attempt rollback
                    try {
                        if (militante && (militante as any).id) {
                            await (adminClient as any).from('militantes').delete().eq('id', (militante as any).id)
                        }
                    } catch (delErr) {
                        console.error('Error cleaning up militante after excepcion en sync:', delErr)
                    }
            console.error('Exception synchronizing usuario after creating militante:', syncErr)
            return NextResponse.json({ error: 'Error sincronizando usuario tras crear militante' }, { status: 500 })
        }

    // Return minimal created id (detailed reads should use GET endpoints)
    return NextResponse.json({ id: (militante as any)?.id || null }, { status: 201 })
    } catch (error: any) {
        console.error('Error en POST /api/militante:', error)
        return NextResponse.json({ error: `Error interno del servidor: ${error.message || error}` }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const adminClient = createAdminClient()
        const body = await request.json()

        const { id, usuario_id, tipo, coordinador_id, compromiso_marketing, compromiso_cautivo, compromiso_impacto, formulario, perfil_id, estado } = body

        // El ID que recibimos es el usuario_id (tabla usuarios es la madre)
        const targetUserId = usuario_id || id
        
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!targetUserId || !uuidRegex.test(targetUserId)) {
            return NextResponse.json({ error: 'usuario_id inválido' }, { status: 400 })
        }

        console.log(`🔍 Actualizando usuario: ${targetUserId}`)

        // 1. PRIMERO: Actualizar la tabla USUARIOS (tabla madre)
        const usuarioUpdatePayload: any = {}
        if (compromiso_marketing !== undefined) usuarioUpdatePayload.compromiso_marketing = compromiso_marketing
        if (compromiso_cautivo !== undefined) usuarioUpdatePayload.compromiso_cautivo = compromiso_cautivo
        if (compromiso_impacto !== undefined) usuarioUpdatePayload.compromiso_impacto = compromiso_impacto

        console.log(`🔄 Actualizando tabla usuarios con:`, usuarioUpdatePayload)

        const { data: updatedUsuario, error: usuarioError } = await (adminClient as any)
            .from('usuarios')
            .update(usuarioUpdatePayload)
            .eq('id', targetUserId)
            .select()

        if (usuarioError) {
            console.error('Error actualizando usuario:', usuarioError)
            return NextResponse.json({ error: 'Error actualizando usuario' }, { status: 500 })
        }

        // 2. SEGUNDO: Actualizar tabla MILITANTES si existe el registro
        const { data: existingMilitante, error: findError } = await (adminClient as any)
            .from('militantes')
            .select('id, usuario_id')
            .eq('usuario_id', targetUserId)
            .single()

        if (!findError && existingMilitante) {
            console.log(`✅ Militante encontrado, actualizando:`, existingMilitante.id)
            
            const militanteUpdatePayload: any = {}
            if (tipo !== undefined) militanteUpdatePayload.tipo = tipo
            if (coordinador_id !== undefined) militanteUpdatePayload.coordinador_id = coordinador_id || null
            if (compromiso_marketing !== undefined) militanteUpdatePayload.compromiso_marketing = compromiso_marketing
            if (compromiso_cautivo !== undefined) militanteUpdatePayload.compromiso_cautivo = compromiso_cautivo
            if (compromiso_impacto !== undefined) militanteUpdatePayload.compromiso_impacto = compromiso_impacto
            if (formulario !== undefined) militanteUpdatePayload.formulario = formulario
            if (perfil_id !== undefined) militanteUpdatePayload.perfil_id = perfil_id || null
            if (estado !== undefined) militanteUpdatePayload.estado = estado

            const { error: militanteError } = await (adminClient as any)
                .from('militantes')
                .update(militanteUpdatePayload)
                .eq('id', existingMilitante.id)

            if (militanteError) {
                console.error('Error actualizando militante:', militanteError)
                return NextResponse.json({ error: 'Error actualizando militante' }, { status: 500 })
            }
        } else {
            console.log(`ℹ️ No existe militante para usuario: ${targetUserId}`)
        }

        console.log(`✅ Actualización completada para usuario: ${targetUserId}`)
        
        return NextResponse.json({ 
            success: true, 
            message: 'Usuario y militante actualizados correctamente' 
        })

    } catch (error: any) {
        console.error('Error en PATCH /api/militante:', error)
        return NextResponse.json({ error: `Error interno del servidor: ${error.message || error}` }, { status: 500 })
    }
}

