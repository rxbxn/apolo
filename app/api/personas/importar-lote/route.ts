import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
    q, qInt, qEmail, qFecha, fixCedula, splitNombre,
    normMap, GENERO_MAP, ESCOLARIDAD_MAP, VIVIENDA_MAP, ESTADO_MAP,
    generarDocumentoPendiente, generarEmailPendiente,
} from '@/lib/personas/import-utils'

// POST /api/personas/importar-lote
// Procesa UN LOTE de filas (formato = mismo que exporta /api/personas/exportar).
// Upsert por CEDULA: si existe -> actualiza, si no existe -> crea. Nunca duplica.
//
// Optimizado para operar en BLOQUE en vez de fila por fila: antes esto hacía
// hasta 7 consultas secuenciales POR FILA (≈10.000 round-trips para 1475
// personas), lo que además de ser lento arriesgaba timeouts a mitad de lote
// — y si un lote fallaba, el cliente abortaba TODO el resto de la
// importación en silencio. Ahora usa upsert masivo (1-2 consultas para las
// 100 filas del lote) con un fallback fila-por-fila SOLO si el lote
// completo falla, para no perder el resto de la importación por un solo
// registro con datos inválidos.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const rowsCrudas: Record<string, any>[] = body?.rows ?? []
        if (!Array.isArray(rowsCrudas) || rowsCrudas.length === 0) {
            return NextResponse.json({ error: 'No se recibieron filas para procesar' }, { status: 400 })
        }

        // Defensa adicional (además del trim en el cliente): normalizar cabeceras
        // con espacios sobrantes tipo "CEDULA ", "COORDINADOR ", "DIRIGENTE " que
        // trae el Excel original, sin depender de qué versión del cliente llamó.
        const rows: Record<string, any>[] = rowsCrudas.map((fila) => {
            const limpia: Record<string, any> = {}
            for (const key of Object.keys(fila)) {
                limpia[key.trim()] = fila[key]
            }
            return limpia
        })

        const adminClient = createAdminClient() as any

        // ── Catálogos geográficos + coordinadores + referencias + dirigentes: una sola carga para todo el lote ──
        const [{ data: ciudadesDb }, { data: localidadesDb }, { data: barriosDb }, { data: coordDb }, { data: referenciaDb }, { data: dirigentesDb }, { data: usuariosRealesDb }] = await Promise.all([
            adminClient.from('ciudades').select('id, nombre'),
            adminClient.from('localidades').select('id, nombre, ciudad_id'),
            adminClient.from('barrios').select('id, nombre, ciudad_id, localidad_id'),
            adminClient.from('coordinadores').select('id, usuarios!coordinadores_usuario_id_fkey(nombres, apellidos)'),
            adminClient.from('referencia').select('id, nombre'),
            adminClient.from('dirigentes').select('id_coordinador, id_dirigente'),
            adminClient.from('usuarios').select('id, nombres, apellidos, email').not('numero_documento', 'like', 'PENDIENTE-%'),
        ])
        const ciudadMap = new Map<string, string>((ciudadesDb ?? []).map((c: any) => [c.nombre.toUpperCase(), c.id]))
        const localidadMap = new Map<string, string>((localidadesDb ?? []).map((l: any) => [`${l.nombre.toUpperCase()}|${l.ciudad_id}`, l.id]))
        const barrioMap = new Map<string, string>((barriosDb ?? []).map((b: any) => [`${b.nombre.toUpperCase()}|${b.ciudad_id}`, b.id]))
        const nombreToCoordId = new Map<string, string>()
        ;(coordDb ?? []).forEach((c: any) => {
            const u = c.usuarios
            if (u) nombreToCoordId.set(`${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim().toUpperCase(), c.id)
        })
        const referenciaMap = new Map<string, string>()
        ;(referenciaDb ?? []).forEach((r: any) => {
            if (r.nombre) referenciaMap.set(String(r.nombre).trim().toUpperCase(), r.id)
        })
        // Nombre completo (persona REAL, con cédula real, no placeholder) ->
        // usuario_id. Sirve para reconocer cuando alguien mencionado como
        // COORDINADOR/DIRIGENTE ya existe como militante con su propia fila
        // en el Excel (pasa seguido) — en vez de inventarle una identidad
        // PENDIENTE-* duplicada, se reutiliza su registro real.
        const usuarioRealPorNombre = new Map<string, { id: string; email: string | null }>()
        ;(usuariosRealesDb ?? []).forEach((u: any) => {
            const key = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim().toUpperCase()
            if (key) usuarioRealPorNombre.set(key, { id: u.id, email: u.email ?? null })
        })
        // Tabla `dirigentes`: vínculo suelto (id_coordinador/id_dirigente son
        // TEXT sin FK real) que registra qué coordinador reporta a qué
        // dirigente. No tiene UNIQUE en la BD real, así que hay que evitar
        // duplicados nosotros mismos — un mismo par puede repetirse en
        // cientos de filas del Excel (un dirigente típicamente agrupa a
        // muchos coordinadores).
        const paresDirigentesExistentes = new Set<string>(
            (dirigentesDb ?? []).map((d: any) => `${d.id_coordinador}|${d.id_dirigente}`)
        )
        const paresDirigentesNuevos: { id_coordinador: string; id_dirigente: string }[] = []

        const errores: { fila: number; cedula: string; error: string }[] = []
        const avisos: string[] = []

        // ── Auto-crear coordinador/dirigente/referencia por nombre ──────────
        // El Excel solo trae el NOMBRE de estas personas (nunca cédula/email:
        // esos datos son del militante). Si el nombre no existe todavía, se
        // crea un usuario + fila en `coordinadores` SIN cuenta de acceso
        // (sin email/password reales) — el admin la activa después desde el
        // módulo Coordinador o Gestión de Roles cuando tenga el dato real.
        // "Coordinador" y "Dirigente" son el mismo tipo de registro en este
        // sistema (militantes.coordinador_id y militantes.dirigente_id apuntan
        // ambos, de forma independiente, a `coordinadores.id`; no hay
        // jerarquía implícita entre las dos columnas de una misma fila).
        async function resolverOCrearCoordinador(nombreOriginal: string): Promise<string | null> {
            const nombreUpper = nombreOriginal.trim().toUpperCase()
            if (!nombreUpper) return null
            const existente = nombreToCoordId.get(nombreUpper)
            if (existente) return existente

            // ¿Ya existe una persona REAL (cédula real) con este nombre
            // exacto? Ej. un dirigente que agrupa a 200 coordinadores
            // normalmente también tiene su propia fila de militante en el
            // mismo Excel — hay que reusar ese usuario, no duplicarlo.
            const real = usuarioRealPorNombre.get(nombreUpper)

            let usuarioId: string
            let emailCoordinador: string

            if (real) {
                usuarioId = real.id
                emailCoordinador = qEmail(real.email) || generarEmailPendiente(nombreUpper)
                avisos.push(`"${nombreUpper}" ya existe como persona real en el sistema — se reusó su registro para el coordinador/dirigente en vez de crear uno duplicado.`)
            } else {
                const { nombres, apellidos } = splitNombre(nombreUpper)
                const docPendiente = generarDocumentoPendiente()
                const emailPendiente = generarEmailPendiente(nombreUpper)

                const { data: nuevoUsuario, error: errUsuario } = await adminClient
                    .from('usuarios')
                    .insert({
                        tipo_documento: 'CC',
                        numero_documento: docPendiente,
                        nombres: nombres || nombreUpper,
                        apellidos: apellidos || '',
                        email: emailPendiente,
                        estado: 'activo',
                        observaciones: 'Creado automáticamente desde import de Personas (solo se conocía el nombre) — completar cédula, email y datos reales en su módulo.',
                    })
                    .select('id')
                    .single()

                if (errUsuario || !nuevoUsuario) {
                    avisos.push(`No se pudo crear coordinador/dirigente automático para "${nombreUpper}": ${errUsuario?.message || 'error desconocido'}`)
                    return null
                }

                usuarioId = nuevoUsuario.id
                emailCoordinador = emailPendiente
                // Se registra ya mismo como "real" por si el nombre se repite
                // más adelante en el mismo lote (otro dirigente citando al
                // mismo coordinador nuevo) — evita crear dos usuarios para
                // el mismo nombre dentro de la misma corrida.
                usuarioRealPorNombre.set(nombreUpper, { id: usuarioId, email: emailPendiente })
                avisos.push(`"${nombreUpper}" creado automáticamente como coordinador/dirigente SIN acceso (sin cédula/email reales) — actívalo desde su módulo cuando tengas el dato.`)
            }

            const { data: nuevoCoord, error: errCoord } = await adminClient
                .from('coordinadores')
                .insert({
                    usuario_id: usuarioId,
                    email: emailCoordinador,
                    tipo: 'Coordinador',
                    estado: 'activo',
                })
                .select('id')
                .single()

            if (errCoord || !nuevoCoord) {
                avisos.push(`No se pudo crear el registro de coordinador para "${nombreUpper}": ${errCoord?.message || 'error desconocido'}`)
                return null
            }

            nombreToCoordId.set(nombreUpper, nuevoCoord.id)
            return nuevoCoord.id
        }

        async function resolverOCrearReferencia(nombreOriginal: string, telefono: string | null): Promise<string | null> {
            const nombreTrim = nombreOriginal.trim()
            if (!nombreTrim) return null
            const key = nombreTrim.toUpperCase()
            const existente = referenciaMap.get(key)
            if (existente) return existente

            const { data: nuevaRef, error } = await adminClient
                .from('referencia')
                .insert({ nombre: nombreTrim, telefono: telefono || null, ciudad: null })
                .select('id')
                .single()

            if (error || !nuevaRef) {
                avisos.push(`No se pudo crear la referencia "${nombreTrim}": ${error?.message || 'error desconocido'}`)
                return null
            }
            referenciaMap.set(key, nuevaRef.id)
            return nuevaRef.id
        }

        // ── Pasada 1: normalizar cada fila y resolver/crear geografía ──────
        // (la geografía nueva es rara — casi siempre pega en caché — así que
        // esto no es el cuello de botella; lo que sí lo era era el usuario+militante)
        interface FilaLista {
            filaNum: number
            cedula: string
            usuarioPayload: Record<string, any>
            militanteExtra: Record<string, any>
        }
        const filas: FilaLista[] = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const filaNum = qInt(row['ID']) || i + 1
            const cedula = fixCedula(row['CEDULA'])

            if (!cedula) {
                errores.push({ fila: filaNum, cedula: '', error: 'Sin cédula — fila omitida' })
                continue
            }

            const nombreCompleto = q(row['NOMBRE COMPLETO']) || ''
            const { nombres, apellidos } = splitNombre(nombreCompleto)

            const ciudadNombre = (q(row['CIUDAD']) || '').toUpperCase()
            let ciudadId: string | null = ciudadNombre ? ciudadMap.get(ciudadNombre) ?? null : null
            if (ciudadNombre && !ciudadId) {
                const { data: nuevaCiudad, error: cErr } = await adminClient
                    .from('ciudades').insert({ nombre: ciudadNombre, activo: true }).select('id').single()
                if (!cErr && nuevaCiudad) { ciudadId = nuevaCiudad.id; ciudadMap.set(ciudadNombre, ciudadId) }
            }

            const localidadNombre = (q(row['LOCALIDAD']) || '').toUpperCase()
            let localidadId: string | null = null
            if (localidadNombre && ciudadId) {
                const key = `${localidadNombre}|${ciudadId}`
                localidadId = localidadMap.get(key) ?? null
                if (!localidadId) {
                    const { data: nuevaLoc, error: lErr } = await adminClient
                        .from('localidades').insert({ nombre: localidadNombre, ciudad_id: ciudadId, activo: true }).select('id').single()
                    if (!lErr && nuevaLoc) { localidadId = nuevaLoc.id; localidadMap.set(key, localidadId) }
                }
            }

            const barrioNombre = (q(row['BARRIO']) || '').toUpperCase()
            let barrioId: string | null = null
            if (barrioNombre && ciudadId) {
                const key = `${barrioNombre}|${ciudadId}`
                barrioId = barrioMap.get(key) ?? null
                if (!barrioId) {
                    const { data: nuevoBarrio, error: bErr } = await adminClient
                        .from('barrios').insert({ nombre: barrioNombre, ciudad_id: ciudadId, localidad_id: localidadId, activo: true }).select('id').single()
                    if (!bErr && nuevoBarrio) { barrioId = nuevoBarrio.id; barrioMap.set(key, barrioId) }
                }
            }

            const email = qEmail(row['EMAIL']) || `migrado_${cedula}@migrado.co`
            const estado = normMap((q(row['ESTADO']) || '').toLowerCase(), ESTADO_MAP) || 'activo'

            const referenciaNombre = q(row['REFERENCIA']) || ''
            const referenciaId = referenciaNombre
                ? await resolverOCrearReferencia(referenciaNombre, q(row['TEL REFERENCIA']))
                : null

            const usuarioPayload: Record<string, any> = {
                tipo_documento: 'CC',
                numero_documento: cedula,
                nombres: nombres || nombreCompleto.toUpperCase(),
                apellidos: apellidos || '',
                email,
                celular: q(row['WHATSAPP']) || null,
                whatsapp: q(row['WHATSAPP']) || null,
                telefono_fijo: q(row['TELEFONO FIJO']) || null,
                direccion: q(row['DIRECCIÓN']) || null,
                ciudad_id: ciudadId,
                ciudad_nombre: ciudadNombre || null,
                localidad_id: localidadId,
                localidad_nombre: localidadNombre || null,
                barrio_id: barrioId,
                barrio_nombre: barrioNombre || null,
                lugar_nacimiento: q(row['LUGAR NACIMIENTO']) || null,
                genero: normMap(q(row['GENERO']), GENERO_MAP),
                nivel_escolaridad: normMap(q(row['ESTUDIOS']), ESCOLARIDAD_MAP),
                perfil_ocupacion: q(row['OCUPACION']) || null,
                tipo_vivienda: normMap(q(row['VIVIENDA']), VIVIENDA_MAP),
                talla_camisa: (q(row['TALLA']) || '').toUpperCase() || null,
                facebook: q(row['FACEBOOK']) || null,
                instagram: q(row['INSTAGRAM']) || null,
                twitter: q(row['TWITTER']) || null,
                referido_por: q(row['REFERENCIA']) || null,
                referencia_id: referenciaId,
                telefono_referencia: q(row['TEL REFERENCIA']) || null,
                ubicacion: q(row['UBICACION']) || null,
                beneficiario: q(row['BENEFICIARIO']) || null,
                poblacion: q(row['POBLACION']) || null,
                numero_hijos: qInt(row['HIJOS']),
                verificacion_sticker: q(row['VERIFICACIÓN STICKER']) || null,
                observacion_verificacion_sticker: q(row['OBSERVACIÓN VERIFICACIÓN STICKER']) || null,
                nombre_verificador: q(row['NOMBRE VERIFICADOR']) || null,
                comp_proyecto: q(row['COMP. PROYECTO']) || null,
                estado,
                observaciones: q(row['OBSERVACIONES']) || null,
            }
            const fechaNac = qFecha(row['NACIMIENTO'])
            if (fechaNac) usuarioPayload.fecha_nacimiento = fechaNac
            else if (q(row['NACIMIENTO'])) avisos.push(`Fila ${filaNum} (${cedula}): NACIMIENTO "${row['NACIMIENTO']}" no se pudo interpretar como fecha — se dejó vacío`)

            const fechaVerifSticker = qFecha(row['FECHA VERIFICACIÓN STICKER'])
            if (fechaVerifSticker) usuarioPayload.fecha_verificacion_sticker = fechaVerifSticker

            const coordNombre = (q(row['COORDINADOR']) || '').toUpperCase()
            const dirNombre = (q(row['DIRIGENTE']) || '').toUpperCase()
            const coordinadorId = coordNombre ? await resolverOCrearCoordinador(coordNombre) : null
            const dirigenteId = dirNombre ? await resolverOCrearCoordinador(dirNombre) : null

            // Si la fila trae AMBOS, registrar en `dirigentes` que ese
            // coordinador reporta a ese dirigente (tabla de jerarquía,
            // separada de militantes.coordinador_id/dirigente_id que solo
            // etiquetan al militante). Un coordinador puede convertirse en
            // dirigente o venir de por fuera — esto no lo decide el import,
            // solo registra el par tal como viene en el Excel.
            if (coordinadorId && dirigenteId && coordinadorId !== dirigenteId) {
                const parKey = `${coordinadorId}|${dirigenteId}`
                if (!paresDirigentesExistentes.has(parKey)) {
                    paresDirigentesExistentes.add(parKey)
                    paresDirigentesNuevos.push({ id_coordinador: coordinadorId, id_dirigente: dirigenteId })
                }
            }

            const tipoExcel = (q(row['TIPO']) || '').toLowerCase()
            if (tipoExcel && tipoExcel !== '80001' && tipoExcel !== 'militante') {
                avisos.push(`Fila ${filaNum} (${cedula}): TIPO=${tipoExcel} sugiere rol de coordinador/dirigente — gestionar manualmente en su módulo`)
            }

            filas.push({
                filaNum,
                cedula,
                usuarioPayload,
                militanteExtra: {
                    tipo: 'militante',
                    coordinador_id: coordinadorId,
                    dirigente_id: dirigenteId,
                    compromiso_marketing: String(qInt(row['COMP. MARKETING'])),
                    compromiso_cautivo: String(qInt(row['COMP. CAUTIVO'])),
                    compromiso_impacto: String(qInt(row['COMP. IMPACTO'])),
                    compromiso_difusion: String(qInt(row['COMP. DIFUSIÓN'])),
                    compromiso_proyecto: q(row['COMP. PROYECTO']) || null,
                    estado,
                },
            })
        }

        if (filas.length === 0) {
            return NextResponse.json({ creados: 0, actualizados: 0, errores, avisos })
        }

        // ── Pasada 2: quiénes ya existen (para contar creados vs actualizados) ──
        const cedulas = filas.map((f) => f.cedula)
        const { data: existentesDb } = await adminClient
            .from('usuarios').select('numero_documento').in('numero_documento', cedulas)
        const yaExistian = new Set<string>((existentesDb ?? []).map((u: any) => u.numero_documento))

        let creados = 0
        let actualizados = 0

        // ── Pasada 3: upsert MASIVO de usuarios (1 consulta para todo el lote) ──
        const usuarioPayloads = filas.map((f) => f.usuarioPayload)
        let cedulaToUsuarioId = new Map<string, string>()

        const { data: upserted, error: upsertErr } = await adminClient
            .from('usuarios')
            .upsert(usuarioPayloads, { onConflict: 'numero_documento' })
            .select('id, numero_documento')

        if (!upsertErr && upserted) {
            upserted.forEach((u: any) => cedulaToUsuarioId.set(u.numero_documento, u.id))
        } else {
            // Fallback fila por fila SOLO para este lote, para aislar el/los
            // registro(s) con datos inválidos sin perder el resto.
            for (const f of filas) {
                const { data: row1, error: rowErr } = await adminClient
                    .from('usuarios')
                    .upsert(f.usuarioPayload, { onConflict: 'numero_documento' })
                    .select('id, numero_documento')
                    .single()
                if (rowErr || !row1) {
                    errores.push({ fila: f.filaNum, cedula: f.cedula, error: rowErr?.message || 'Error desconocido guardando usuario' })
                } else {
                    cedulaToUsuarioId.set(row1.numero_documento, row1.id)
                }
            }
        }

        for (const cedula of cedulaToUsuarioId.keys()) {
            if (yaExistian.has(cedula)) actualizados++
            else creados++
        }

        // ── Pasada 4: militantes — bulk fetch existentes, luego insert/update ──
        const usuarioIds = [...cedulaToUsuarioId.values()]
        const { data: militantesExistentesDb } = await adminClient
            .from('militantes').select('id, usuario_id').in('usuario_id', usuarioIds)
        const usuarioIdToMilitanteId = new Map<string, string>(
            (militantesExistentesDb ?? []).map((m: any) => [m.usuario_id, m.id])
        )

        const militantesAInsertar: Record<string, any>[] = []
        const actualizacionesMilitante: Promise<any>[] = []

        for (const f of filas) {
            const usuarioId = cedulaToUsuarioId.get(f.cedula)
            if (!usuarioId) continue // esta fila falló en la pasada 3, ya quedó en errores

            const militanteId = usuarioIdToMilitanteId.get(usuarioId)
            if (militanteId) {
                actualizacionesMilitante.push(
                    adminClient.from('militantes').update(f.militanteExtra).eq('id', militanteId)
                )
            } else {
                militantesAInsertar.push({ usuario_id: usuarioId, ...f.militanteExtra })
            }
        }

        const insertDirigentes = paresDirigentesNuevos.length > 0
            ? adminClient.from('dirigentes').insert(paresDirigentesNuevos).then(({ error }: any) => {
                if (error) avisos.push(`No se pudieron guardar ${paresDirigentesNuevos.length} vínculos coordinador↔dirigente: ${error.message}`)
            })
            : Promise.resolve()

        await Promise.all([
            militantesAInsertar.length > 0
                ? adminClient.from('militantes').insert(militantesAInsertar)
                : Promise.resolve(),
            ...actualizacionesMilitante,
            insertDirigentes,
        ])

        return NextResponse.json({ creados, actualizados, errores, avisos })
    } catch (error: any) {
        console.error('Error procesando lote de importación:', error)
        return NextResponse.json({ error: error?.message || 'Error interno procesando el lote' }, { status: 500 })
    }
}
