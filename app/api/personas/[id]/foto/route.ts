import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getMinioClient, MINIO_BUCKET, getFotoPublicUrl, FOTO_MIME_PERMITIDOS, FOTO_MAX_BYTES } from '@/lib/minio/client'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params

        const formData = await request.formData()
        const file = formData.get('foto') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No se recibió ningún archivo (campo "foto")' }, { status: 400 })
        }

        if (!FOTO_MIME_PERMITIDOS.includes(file.type)) {
            return NextResponse.json(
                { error: `Tipo de archivo no permitido: ${file.type}. Solo JPEG, PNG o WEBP.` },
                { status: 400 }
            )
        }

        if (file.size > FOTO_MAX_BYTES) {
            return NextResponse.json({ error: 'La imagen supera el máximo de 5MB' }, { status: 400 })
        }

        const adminClient = createAdminClient()

        // Confirmar que el usuario existe antes de subir nada
        const { data: usuario, error: usuarioErr } = await adminClient
            .from('usuarios')
            .select('id, foto_perfil_url')
            .eq('id', id)
            .single()

        if (usuarioErr || !usuario) {
            return NextResponse.json({ error: 'Persona no encontrada' }, { status: 404 })
        }

        const minio = getMinioClient()
        const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
        const objectKey = `usuarios/${id}-${Date.now()}.${ext}`

        const buffer = Buffer.from(await file.arrayBuffer())
        await minio.putObject(MINIO_BUCKET, objectKey, buffer, buffer.length, {
            'Content-Type': file.type,
        })

        const publicUrl = getFotoPublicUrl(objectKey)

        const { error: updateErr } = await (adminClient as any)
            .from('usuarios')
            .update({ foto_perfil_url: publicUrl })
            .eq('id', id)

        if (updateErr) {
            return NextResponse.json({ error: `Foto subida pero no se pudo guardar en el usuario: ${updateErr.message}` }, { status: 500 })
        }

        // Borrar la foto anterior en MinIO si existía y era de este mismo bucket (limpieza, no bloquea la respuesta)
        const anterior = (usuario as any).foto_perfil_url as string | null
        if (anterior && anterior.includes(`/${MINIO_BUCKET}/`)) {
            const anteriorKey = anterior.split(`/${MINIO_BUCKET}/`)[1]
            if (anteriorKey) {
                minio.removeObject(MINIO_BUCKET, anteriorKey).catch((e) =>
                    console.warn('No se pudo borrar la foto anterior en MinIO:', e)
                )
            }
        }

        return NextResponse.json({ success: true, foto_perfil_url: publicUrl })
    } catch (error: any) {
        console.error('Error subiendo foto de perfil:', error)
        return NextResponse.json({ error: error?.message || 'Error interno subiendo la foto' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const adminClient = createAdminClient()

        const { data: usuario } = await adminClient
            .from('usuarios')
            .select('foto_perfil_url')
            .eq('id', id)
            .single()

        const anterior = (usuario as any)?.foto_perfil_url as string | null

        const { error } = await (adminClient as any)
            .from('usuarios')
            .update({ foto_perfil_url: null })
            .eq('id', id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        if (anterior && anterior.includes(`/${MINIO_BUCKET}/`)) {
            const anteriorKey = anterior.split(`/${MINIO_BUCKET}/`)[1]
            if (anteriorKey) {
                const minio = getMinioClient()
                minio.removeObject(MINIO_BUCKET, anteriorKey).catch((e) =>
                    console.warn('No se pudo borrar la foto en MinIO:', e)
                )
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error eliminando foto de perfil:', error)
        return NextResponse.json({ error: error?.message || 'Error interno eliminando la foto' }, { status: 500 })
    }
}
