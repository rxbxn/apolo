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
// repetidos a un solo espacio, recorta y pasa a mayúsculas. NO se le quitan
// tildes ni se hace fuzzy matching — el usuario pidió match EXACTO (por
// nombre completo), así que solo se normalizan mayúsculas/espacios, que es
// lo mínimo para que un archivo escrito a mano coincida con el registro.
function normalizar(nombre: string): string {
    return nombre
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase()
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

        // 2. Cargar todos los usuarios una sola vez y construir el índice de
        // nombre normalizado -> [ids] (para detectar homónimos = ambiguos)
        const adminClient = createAdminClient()
        const { data: usuarios, error: usuariosErr } = await adminClient
            .from('usuarios')
            .select('id, nombres, apellidos, foto_perfil_url')

        if (usuariosErr) {
            return NextResponse.json({ error: `No se pudo cargar la lista de personas: ${usuariosErr.message}` }, { status: 500 })
        }

        const indice = new Map<string, any[]>()
        for (const u of (usuarios || []) as any[]) {
            const clave = normalizar(`${u.nombres || ''} ${u.apellidos || ''}`)
            if (!clave) continue
            const lista = indice.get(clave) || []
            lista.push(u)
            indice.set(clave, lista)
        }

        // 3. Emparejar y subir
        const minio = getMinioClient()
        const actualizados: { archivo: string; persona: string; usuarioId: string }[] = []
        const sinCoincidencia: string[] = []
        const ambiguos: { archivo: string; coincidencias: number }[] = []
        const errores: { archivo: string; error: string }[] = [...erroresLectura]

        for (const archivo of archivos) {
            const clave = normalizar(archivo.nombreOriginal)
            const candidatos = indice.get(clave) || []

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
