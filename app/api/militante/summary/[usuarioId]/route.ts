import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: { usuarioId: string } }) {
  // Normalize and validate usuarioId param
  let { usuarioId } = params
  // If params is empty (Next might not populate in some environments), try extract from path
  if (!usuarioId) {
    try {
      const u = new URL(request.url)
      const m = u.pathname.match(/\/api\/militante\/summary\/([^\/]+)/)
      if (m && m[1]) usuarioId = m[1]
    } catch (e) {
      // ignore
    }
  }
  try {
    // normalize in case it's quoted or an array
    if (Array.isArray(usuarioId)) usuarioId = usuarioId[0]
    usuarioId = typeof usuarioId === 'string' ? usuarioId.trim().replace(/^"|"$/g, '') : String(usuarioId || '')

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  // Simple UUID validator available for subsequent lookups
  const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v)
    if (!usuarioId || usuarioId.toLowerCase() === 'undefined' || usuarioId.toLowerCase() === 'null' || !uuidRegex.test(usuarioId)) {
      console.warn('GET /api/militante/summary - invalid usuarioId:', params)
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ error: `usuarioId no tiene formato UUID válido: ${String(params?.usuarioId)}`, params }, { status: 400 })
      }
      return NextResponse.json({ error: `usuarioId no tiene formato UUID válido` }, { status: 400 })
    }

    // Use cookie-backed client by default (respetar RLS). Use admin client only when explicitly needed.
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
      const { data: militante, error: militanteError } = await supabase
        .from('militantes')
        .select('*')
        .eq('usuario_id', usuarioId)
        .limit(1)
        .single()

      if (militanteError) {
        // If no rows found, return null
        if ((militanteError as any).message?.toLowerCase()?.includes('no rows') || (militanteError as any).code === 'PGRST116') {
          return NextResponse.json(null)
        }

        // Build a serializable error payload
        const me: any = militanteError as any
        const militanteErrorPayload: any = {
          message: me?.message || String(me),
          code: me?.code,
          details: me?.details,
          hint: me?.hint,
        }

        console.error('Error fetching militante with admin client:', militanteErrorPayload)
        if (process.env.NODE_ENV === 'development') {
          return NextResponse.json({ error: militanteErrorPayload }, { status: 500 })
        }
        return NextResponse.json(null, { status: 500 })
      }

      if (!militante) {
        // No militante found for this usuario
        return NextResponse.json(null)
      }

      // Fetch usuario row to merge
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, nombres, apellidos, numero_documento, tipo_documento, celular, email, ciudad_id, zona_id')
        .eq('id', usuarioId)
        .limit(1)
        .single()

      if (usuarioError) {
        console.error('Error fetching usuario with admin client:', usuarioError)
        if (process.env.NODE_ENV === 'development') {
          return NextResponse.json({ militante, usuarioError: String(usuarioError) })
        }
        return NextResponse.json(militante)
      }

      // Cast to any to avoid TS type issues in this server route
      const militanteAny: any = militante as any
      const usuarioAny: any = usuario as any

      const merged = {
        ...(militanteAny || {}),
        usuario_id: usuarioAny?.id,
        nombres: usuarioAny?.nombres,
        apellidos: usuarioAny?.apellidos,
        numero_documento: usuarioAny?.numero_documento,
        tipo_documento: usuarioAny?.tipo_documento,
        celular: usuarioAny?.celular,
        usuario_email: usuarioAny?.email,
        ciudad_id: usuarioAny?.ciudad_id,
        zona_id: usuarioAny?.zona_id,
      }

      // If militante has perfil_id, fetch perfil name explicitly to avoid PostgREST relationship errors
      try {
        // Debug: log the militante object shape to catch unexpected nested fields
        try {
          console.debug('militanteAny for summary:', JSON.stringify(militanteAny))
        } catch (e) {
          console.debug('militanteAny (non-serializable):', militanteAny)
        }

    const perfilIdRaw = (militanteAny && (militanteAny.perfil_id || militanteAny.perfil)) || null

        // Helper to validate UUID strings (simple RFC4122-ish check)
        const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v)

        let perfilId: string | null = null
        if (perfilIdRaw && typeof perfilIdRaw === 'string') {
          perfilId = perfilIdRaw
        } else if (perfilIdRaw && typeof perfilIdRaw === 'object' && (perfilIdRaw as any).id) {
          perfilId = (perfilIdRaw as any).id
        }

        if (!perfilId) {
          console.debug('No perfilId derived from militante (skipping perfiles lookup). perfilRaw=', perfilIdRaw)
        }

        if (perfilId && isUuid(perfilId)) {
          console.debug('Fetching perfil for id:', perfilId)
          const { data: perfilData, error: perfilError } = await supabase
            .from('perfiles')
            .select('id, nombre')
            .eq('id', perfilId)
            .limit(1)
            .single()

          if (!perfilError && perfilData) {
            const perfilAny: any = perfilData as any
            merged.perfil_id = perfilAny.id
            merged.perfil_nombre = perfilAny.nombre
          } else if (perfilError) {
            console.debug('perfil lookup returned error:', perfilError)
          }
        } else if (perfilId) {
          console.warn('Derived perfilId is not a valid UUID, skipping lookup:', perfilId)
        }
      } catch (err) {
        // ignore perfil fetch errors; we still return the merged object
        console.error('Error fetching perfil for militante summary:', err)
      }

      // If militante has coordinador_id, fetch coordinador and its usuario name
      try {
        const coordIdRaw = (militanteAny && (militanteAny.coordinador_id || militanteAny.coordinador)) || null
        let coordId: string | null = null
        if (coordIdRaw && typeof coordIdRaw === 'string') coordId = coordIdRaw
        else if (coordIdRaw && typeof coordIdRaw === 'object' && (coordIdRaw as any).id) coordId = (coordIdRaw as any).id

        if (coordId && isUuid(coordId)) {
          const { data: coordRow, error: coordErr } = await supabase.from('coordinadores').select('id, usuario_id, email').eq('id', coordId).limit(1).single()
          if (!coordErr && coordRow) {
            // Try to get usuario name
            try {
              const { data: coordUser, error: coordUserErr } = await supabase.from('usuarios').select('nombres, apellidos').eq('id', (coordRow as any).usuario_id).limit(1).single()
              if (!coordUserErr && coordUser) {
                merged.coordinador_id = (coordRow as any).id
                merged.coordinador_nombre = `${(coordUser as any).nombres || ''} ${(coordUser as any).apellidos || ''}`.trim() || null
              } else {
                merged.coordinador_id = (coordRow as any).id
                merged.coordinador_nombre = null
              }
            } catch (e) {
              console.debug('Error fetching coordinador usuario:', e)
            }
          }
        }
      } catch (e) {
        console.error('Error fetching coordinador for militante summary:', e)
      }

      // If militante has tipo (tipos_militante), try to resolve it by id or by codigo
      try {
        const tipoRaw = (militanteAny && (militanteAny.tipo || militanteAny.tipo_id)) || null

        if (tipoRaw !== null && tipoRaw !== undefined) {
          let tipoRow: any = null

          // If tipo is an object, prefer explicit id or codigo
          if (typeof tipoRaw === 'object') {
            if ((tipoRaw as any).id) {
              const { data: tr, error: trErr } = await supabase.from('tipos_militante').select('id, codigo, descripcion').eq('id', (tipoRaw as any).id).limit(1).single()
              if (!trErr && tr) tipoRow = tr
            }
            if (!tipoRow && (tipoRaw as any).codigo !== undefined) {
              const { data: tr, error: trErr } = await supabase.from('tipos_militante').select('id, codigo, descripcion').eq('codigo', (tipoRaw as any).codigo).limit(1).single()
              if (!trErr && tr) tipoRow = tr
            }
          } else {
            const tipoStr = String(tipoRaw).trim()

            // If it looks like a UUID, try to fetch by id
            if (isUuid(tipoStr)) {
              const { data: tr, error: trErr } = await supabase.from('tipos_militante').select('id, codigo, descripcion').eq('id', tipoStr).limit(1).single()
              if (!trErr && tr) tipoRow = tr
            }

            // If not found yet, try by codigo (string or numeric)
            if (!tipoRow) {
              const { data: tr, error: trErr } = await supabase.from('tipos_militante').select('id, codigo, descripcion').eq('codigo', tipoStr).limit(1).single()
              if (!trErr && tr) tipoRow = tr
            }

            // As a last attempt, if it's an integer-like string, try numeric match
            if (!tipoRow && /^\d+$/.test(tipoStr)) {
              const { data: tr, error: trErr } = await supabase.from('tipos_militante').select('id, codigo, descripcion').eq('codigo', Number(tipoStr)).limit(1).single()
              if (!trErr && tr) tipoRow = tr
            }
          }

          if (tipoRow) {
            merged.tipo = tipoRow.id
            merged.tipo_descripcion = tipoRow.descripcion
            merged.tipo_codigo = tipoRow.codigo
          } else {
            // No matching tipo found; fallback to exposing the raw value so the UI can handle it
            merged.tipo_descripcion = merged.tipo_descripcion || String(tipoRaw)
            merged.tipo_codigo = merged.tipo_codigo || (typeof tipoRaw === 'number' ? tipoRaw : String(tipoRaw))
          }
        }
      } catch (e) {
        console.error('Error fetching tipo for militante summary:', e)
      }

      return NextResponse.json(merged)
    } catch (err: any) {
      // Log full error to server console for debugging
      console.error('Unexpected admin query error:', err)

      // Prepare a serializable payload
      const payload: any = {
        message: err?.message || String(err),
      }
      if (process.env.NODE_ENV === 'development') {
        payload.stack = err?.stack
        // include any other enumerable fields
        for (const k of Object.keys(err || {})) {
          try {
            payload[k] = (err as any)[k]
          } catch (_) {
            // ignore
          }
        }
        return NextResponse.json({ error: payload }, { status: 500 })
      }

      return NextResponse.json(null, { status: 500 })
    }
  } catch (e) {
    console.error('Unexpected error fetching militante summary:', e)
    return NextResponse.json(null, { status: 500 })
  }
}
