"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, Trash2, UserRound } from "lucide-react"
import { toast } from "sonner"

interface FotoPerfilUploadProps {
    usuarioId: string
    fotoActual?: string | null
    onFotoActualizada?: (url: string | null) => void
}

const MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"]
const MAX_BYTES = 5 * 1024 * 1024

export function FotoPerfilUpload({ usuarioId, fotoActual, onFotoActualizada }: FotoPerfilUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [foto, setFoto] = useState<string | null>(fotoActual ?? null)
    const [subiendo, setSubiendo] = useState(false)

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (!MIME_PERMITIDOS.includes(file.type)) {
            toast.error("Solo se permiten imágenes JPEG, PNG o WEBP")
            return
        }
        if (file.size > MAX_BYTES) {
            toast.error("La imagen no puede superar 5MB")
            return
        }

        setSubiendo(true)
        try {
            const formData = new FormData()
            formData.append("foto", file)

            const res = await fetch(`/api/personas/${usuarioId}/foto`, {
                method: "POST",
                body: formData,
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || "Error subiendo la foto")

            setFoto(data.foto_perfil_url)
            onFotoActualizada?.(data.foto_perfil_url)
            toast.success("Foto actualizada")
        } catch (err: any) {
            toast.error(err.message || "Error subiendo la foto")
        } finally {
            setSubiendo(false)
            if (inputRef.current) inputRef.current.value = ""
        }
    }

    async function handleEliminar() {
        setSubiendo(true)
        try {
            const res = await fetch(`/api/personas/${usuarioId}/foto`, { method: "DELETE" })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error eliminando la foto")

            setFoto(null)
            onFotoActualizada?.(null)
            toast.success("Foto eliminada")
        } catch (err: any) {
            toast.error(err.message || "Error eliminando la foto")
        } finally {
            setSubiendo(false)
        }
    }

    return (
        <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {foto ? (
                    <Image src={foto} alt="Foto de perfil" width={80} height={80} className="object-cover w-20 h-20" />
                ) : (
                    <UserRound className="w-8 h-8 text-muted-foreground" />
                )}
            </div>

            <div className="flex flex-col gap-2">
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={subiendo}
                />
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={subiendo}
                        onClick={() => inputRef.current?.click()}
                    >
                        {subiendo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {foto ? "Cambiar foto" : "Subir foto"}
                    </Button>
                    {foto && (
                        <Button type="button" variant="ghost" size="sm" disabled={subiendo} onClick={handleEliminar}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">JPEG, PNG o WEBP. Máximo 5MB.</p>
            </div>
        </div>
    )
}
