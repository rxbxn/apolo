import { Client as MinioClient } from 'minio'

// Cliente MinIO singleton (server-only — nunca importar desde un componente 'use client')
let client: MinioClient | null = null

export function getMinioClient(): MinioClient {
    if (client) return client

    const endPoint = process.env.MINIO_ENDPOINT
    const port = parseInt(process.env.MINIO_PORT || '9000', 10)
    const useSSL = process.env.MINIO_USE_SSL === 'true'
    const accessKey = process.env.MINIO_ACCESS_KEY
    const secretKey = process.env.MINIO_SECRET_KEY

    if (!endPoint || !accessKey || !secretKey) {
        throw new Error(
            'Faltan variables de entorno de MinIO (MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY). ' +
            'Agrégalas a .env.local.'
        )
    }

    client = new MinioClient({ endPoint, port, useSSL, accessKey, secretKey })
    return client
}

export const MINIO_BUCKET = process.env.MINIO_BUCKET || 'apolo-fotos'

// URL pública para leer un objeto (el bucket está configurado con `mc anonymous set download`,
// así que no hace falta firmar la URL para GET).
export function getFotoPublicUrl(objectKey: string): string {
    const base = process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${MINIO_BUCKET}`
    return `${base.replace(/\/$/, '')}/${objectKey}`
}

// Tipos de imagen permitidos y tamaño máximo (5MB)
export const FOTO_MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
export const FOTO_MAX_BYTES = 5 * 1024 * 1024
