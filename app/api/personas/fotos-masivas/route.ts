import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createAdminClient } from '@/lib/supabase/server'
import { getMinioClient, MINIO_BUCKET, getFotoPublicUrl, FOTO_MAX_BYTES } from '@/lib/minio/client'

// Extensiones de imagen soportadas → mime real que se guarda en MinIO.
const EXT_A_MIME: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
}

interface ArchivoEntrada {
    // Nombre de archivo SIN extensión, tal cual venía (para mostrarlo en el resumen)
    nombreOriginal: string
    ext: string
    buffer: Buffer
}

// Normaliza el nombre de archivo para compararlo contra "nombres apellidos"
// de la base: quita extensión, colapsa espacios/guiones/guiones bajos
// repetidos a un solo espacio, recorta y pasa a mayúsculas.
function normalizar(nombre: string): string {
    return nombre
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase()
}

// Igual que normalizar(), pero además quita tildes/diacríticos (JOSÉ ->
// JOSE). Se usa SOLO como respaldo cuando el match exacto no encontró nada
// — así un archivo escrito sin tilde ("JOSE PEREZ.jpg") sí encuentra a
// "JOSÉ PÉREZ" en la base, sin debilitar el match exacto para los casos que
// ya funcionan (si hay dos personas que solo se distinguen por una tilde,
// el match exacto las sigue diferenciando bien).
function quitarTildes(clave: string): string {
    return clave.normalize('NFD').replace(/[̀-ͯ]/g, '')
}
function normalizarSinTildes(nombre: string): string {
    return quitarTildes(normalizar(nombre))
}

// Herramientas de fotos / exportadores masivos suelen agregarle al nombre
// del archivo metadata de tracking pegada con "_" — un ID interno, un
// timestamp, o un fragmento de UUID — para no pisar archivos repetidos:
//   "KATY SORAYA MORENO PEREIRA_979-100.jpg"
//   "KELLY JORDANA OVALLE APARICIO_675-1763492204504.jpg"
//   "LAURA MILENA DAGER GARCÍA_2-4352-ad85-9412.jpg"        (fragmento de UUID)
//   "LISETH DEL CARMEN MONTAÑO DIAZ__430-1762202597548.jpg" (doble "_")
// En todos los casos, después del último bloque de "_" viene puro ruido:
// dígitos, guiones y a lo sumo letras hex (a-f, de un UUID) — nunca texto de
// nombre real. Se quita ANTES de normalizar (que es lo que convierte "_" y
// "-" en espacios), operando sobre el nombre crudo del archivo. Exige que el
// bloque tenga al menos un dígito, para no tocar por error un archivo que sí
// use "_" simplemente como separador de palabras del nombre (ej.
// "JUAN_PEREZ.jpg" no matchea el patrón porque "PEREZ" no es numérico/hex).
function quitarMetadataArchivo(nombreOriginal: string): string {
    return nombreOriginal
        .replace(/_+[0-9a-fA-F-]*\d[0-9a-fA-F-]*$/i, '') // "_979-100", "__430-176...", "_2-4352-ad85-9412"
        .replace(/\s*\(\d+\)$/, '')                       // "NOMBRE (2)" — copia duplicada del sistema operativo
        .trim()
}

// Si el nombre del archivo es puramente numérico (con o sin puntos/guiones),
// probablemente es una cédula en vez de un nombre — pasa esto cuando quien
// arma las fotos nombra los archivos por documento en vez de por nombre.
function pareceCedula(valor: string): boolean {
    return /^\d{5,15}$/.test(valor.replace(/[.\s-]/g, ''))
}
function soloDigitos(valor: string): string {
    return valor.replace(/[.\s-]/g, '')
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const zipFile = formData.get('zip') as File | null
        const fotosSueltas = formData.getAll('fotos') as File[]

        if (!zipFile && fotosSueltas.length === 0) {
            return NextResponse.json({ error: 'No se recibió ningún archivo (ZIP o imágenes)' }, { status: 400 })
        }

        // 1. Reunir todos los archivos de imagen a procesar (del ZIP + sueltos)
        const archivos: ArchivoEntrada[] = []
        const erroresLectura: { archivo: string; error: string }[] = []

        if (zipFile) {
            try {
                const zipBuffer = Buffer.from(await zipFile.arrayBuffer())
                const zip = await JSZip.loadAsync(zipBuffer)

                for (const [path, entry] of Object.entries(zip.files)) {
                    if (entry.dir) continue
                    // Ignorar carpetas de metadata que suelen venir en ZIPs de macOS/Windows
                    const base = path.split('/').pop() || path
                    if (base.startsWith('.') || path.startsWith('__MACOSX/')) continue

                    const match = base.match(/^(.+)\.([A-Za-z0-9]+)$/)
                    if (!match) continue
                    const [, nombreSinExt, extRaw] = match
                    const ext = extRaw.toLowerCase()
                    if (!EXT_A_MIME[ext]) continue // no es imagen soportada, se ignora en silencio

                    const buffer = await entry.async('nodebuffer')
                    if (buffer.length > FOTO_MAX_BYTES) {
                        erroresLectura.push({ archivo: base, error: 'Supera el máximo de 5MB' })
                        continue
                    }
                    archivos.push({ nombreOriginal: nombreSinExt, ext, buffer })
                }
            } catch (e: any) {
                return NextResponse.json({ error: `No se pudo leer el ZIP: ${e?.message || e}` }, { status: 400 })
            }
        }

        for (const file of fotosSueltas) {
            const match = file.name.match(/^(.+)\.([A-Za-z0-9]+)$/)
            if (!match) {
                erroresLectura.push({ archivo: file.name, error: 'Nombre de archivo sin extensión reconocible' })
                continue
            }
            const [, nombreSinExt, extRaw] = match
            const ext = extRaw.toLowerCase()
            if (!EXT_A_MIME[ext]) {
                erroresLectura.push({ archivo: file.name, error: 'Formato no soportado (solo JPEG, PNG, WEBP)' })
                continue
            }
            if (file.size > FOTO_MAX_BYTES) {
                erroresLectura.push({ archivo: file.name, error: 'Supera el máximo de 5MB' })
                continue
            }
            const buffer = Buffer.from(await file.arrayBuffer())
            archivos.push({ nombreOriginal: nombreSinExt, ext, buffer })
        }

        if (archivos.length === 0) {
            return NextResponse.json({
                total: 0,
                actualizados: [],
                sin_coincidencia: [],
                ambiguos: [],
                errores: erroresLectura,
            })
        }

        // 2. Cargar todos los usuarios una sola vez y construir tres índices:
        // exacto (nombre normalizado), sin tildes (respaldo) y por cédula
        // (respaldo cuando el archivo se llama por número de documento).
        const adminClient = createAdminClient()
        const { data: usuarios, error: usuariosErr } = await adminClient
            .from('usuarios')
            .select('id, nombres, apellidos, foto_perfil_url, numero_documento')

        if (usuariosErr) {
            return NextResponse.json({ error: `No se pudo cargar la lista de personas: ${usuariosErr.message}` }, { status: 500 })
        }

        const indice = new Map<string, any[]>()
        const indiceSinTildes = new Map<string, any[]>()
        const indicePorCedula = new Map<string, any>()
        for (const u of (usuarios || []) as any[]) {
            const nombreCompleto = `${u.nombres || ''} ${u.apellidos || ''}`
            const clave = normalizar(nombreCompleto)
            if (clave) {
                const lista = indice.get(clave) || []
                lista.push(u)
                indice.set(clave, lista)
            }

            const claveSinTildes = normalizarSinTildes(nombreCompleto)
            if (claveSinTildes) {
                const listaSinTildes = indiceSinTildes.get(claveSinTildes) || []
                listaSinTildes.push(u)
                indiceSinTildes.set(claveSinTildes, listaSinTildes)
            }

            const cedula = soloDigitos(String(u.numero_documento || ''))
            if (cedula) indicePorCedula.set(cedula, u)
        }

        // 3. Emparejar y subir
        const minio = getMinioClient()
        const actualizados: { archivo: string; persona: string; usuarioId: string }[] = []
        const sinCoincidencia: string[] = []
        const ambiguos: { archivo: string; coincidencias: number }[] = []
        const errores: { archivo: string; error: string }[] = [...erroresLectura]

        for (const archivo of archivos) {
            const clave = normalizar(archivo.nombreOriginal)
            const nombreSinMetadata = quitarMetadataArchivo(archivo.nombreOriginal)
            const claveSinMetadata = normalizar(nombreSinMetadata)
            const haySufijo = claveSinMetadata !== clave

            let candidatos = indice.get(clave) || []
            let via: 'exacto' | 'cedula' | 'sin_sufijo' | 'sin_tildes' = 'exacto'

            // Respaldo 1: el archivo trae metadata de tracking pegada con "_"
            // (ID interno, timestamp, o fragmento de UUID) — es el caso más
            // común en exports masivos. Se prueba ANTES que cédula/tildes
            // porque es, con diferencia, el motivo más frecuente de que no
            // matchee.
            if (candidatos.length === 0 && haySufijo) {
                candidatos = indice.get(claveSinMetadata) || []
                via = 'sin_sufijo'
            }

            // Respaldo 2: el archivo se llama por cédula en vez de por nombre.
            if (candidatos.length === 0 && pareceCedula(archivo.nombreOriginal)) {
                const porCedula = indicePorCedula.get(soloDigitos(archivo.nombreOriginal))
                if (porCedula) {
                    candidatos = [porCedula]
                    via = 'cedula'
                }
            }

            // Respaldo 3: no hubo match por ninguna de las anteriores — probar
            // sin tildes (ej. archivo "JOSE PEREZ.jpg" contra persona "JOSÉ
            // PÉREZ"), incluyendo también la variante sin metadata.
            if (candidatos.length === 0) {
                candidatos = indiceSinTildes.get(quitarTildes(clave)) || []
                via = 'sin_tildes'
            }
            if (candidatos.length === 0 && haySufijo) {
                candidatos = indiceSinTildes.get(quitarTildes(claveSinMetadata)) || []
                via = 'sin_tildes'
            }

            if (candidatos.length === 0) {
                sinCoincidencia.push(`${archivo.nombreOriginal}.${archivo.ext}`)
                continue
            }
            if (candidatos.length > 1) {
                ambiguos.push({ archivo: `${archivo.nombreOriginal}.${archivo.ext}`, coincidencias: candidatos.length })
                continue
            }

            const persona = candidatos[0]
            try {
                const mime = EXT_A_MIME[archivo.ext]
                const objectKey = `usuarios/${persona.id}-${Date.now()}.${archivo.ext === 'jpeg' ? 'jpg' : archivo.ext}`

                await minio.putObject(MINIO_BUCKET, objectKey, archivo.buffer, archivo.buffer.length, {
                    'Content-Type': mime,
                })

                const publicUrl = getFotoPublicUrl(objectKey)

                const { error: updateErr } = await (adminClient as any)
                    .from('usuarios')
                    .update({ foto_perfil_url: publicUrl })
                    .eq('id', persona.id)

                if (updateErr) {
                    errores.push({ archivo: `${archivo.nombreOriginal}.${archivo.ext}`, error: updateErr.message })
                    continue
                }

                // Borrar la foto anterior en MinIO si existía (limpieza, no bloquea la respuesta)
                const anterior = persona.foto_perfil_url as string | null
                if (anterior && anterior.includes(`/${MINIO_BUCKET}/`)) {
                    const anteriorKey = anterior.split(`/${MINIO_BUCKET}/`)[1]
                    if (anteriorKey) {
                        minio.removeObject(MINIO_BUCKET, anteriorKey).catch((e) =>
                            console.warn('No se pudo borrar la foto anterior en MinIO:', e)
                        )
                    }
                }

                actualizados.push({
                    archivo: `${archivo.nombreOriginal}.${archivo.ext}`,
                    persona: `${persona.nombres || ''} ${persona.apellidos || ''}`.trim(),
                    usuarioId: persona.id,
                    // Cómo se encontró la coincidencia — solo se marca cuando
                    // NO fue por nombre exacto, para que el admin pueda revisar
                    // rápido cuáles vinieron del respaldo por tilde o cédula.
                    ...(via !== 'exacto' ? { via } : {}),
                })
            } catch (e: any) {
                errores.push({ archivo: `${archivo.nombreOriginal}.${archivo.ext}`, error: e?.message || 'Error subiendo la imagen' })
            }
        }

        return NextResponse.json({
            total: archivos.length,
            actualizados,
            sin_coincidencia: sinCoincidencia,
            ambiguos,
            errores,
        })
    } catch (error: any) {
        console.error('Error en actualización masiva de fotos:', error)
        return NextResponse.json({ error: error?.message || 'Error interno procesando las fotos' }, { status: 500 })
    }
}
