"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Loader2, Upload, FileArchive, Images, CheckCircle2, XCircle, HelpCircle } from "lucide-react"
import { toast } from "sonner"

interface ResultadoFotosMasivas {
    total: number
    actualizados: { archivo: string; persona: string; usuarioId: string; via?: "cedula" | "sin_sufijo" | "sin_tildes" }[]
    sin_coincidencia: string[]
    ambiguos: { archivo: string; coincidencias: number }[]
    errores: { archivo: string; error: string }[]
}

// Sube el FormData con XMLHttpRequest en vez de fetch — es lo único que
// expone el progreso real de la subida (fetch no tiene evento de progreso de
// upload). Con ZIPs grandes o muchas imágenes, esto es lo que tarda; el
// procesamiento en el servidor (emparejar + subir a MinIO) es rápido en
// comparación.
function subirConProgreso(url: string, formData: FormData, onProgress: (pct: number) => void): Promise<any> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", url)
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100))
            }
        }
        xhr.onload = () => {
            try {
                const data = JSON.parse(xhr.responseText)
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(data)
                } else {
                    reject(new Error(data?.error || `Error HTTP ${xhr.status}`))
                }
            } catch {
                reject(new Error("Respuesta inválida del servidor"))
            }
        }
        xhr.onerror = () => reject(new Error("Error de red subiendo los archivos"))
        xhr.send(formData)
    })
}

export function FotosMasivasUpload() {
    const zipInputRef = useRef<HTMLInputElement>(null)
    const imagenesInputRef = useRef<HTMLInputElement>(null)

    const [zip, setZip] = useState<File | null>(null)
    const [imagenes, setImagenes] = useState<File[]>([])
    const [subiendo, setSubiendo] = useState(false)
    const [progreso, setProgreso] = useState(0)
    const [procesandoServidor, setProcesandoServidor] = useState(false)
    const [resultado, setResultado] = useState<ResultadoFotosMasivas | null>(null)

    const hayArchivos = !!zip || imagenes.length > 0

    async function handleProcesar() {
        if (!hayArchivos) {
            toast.error("Selecciona un ZIP o al menos una imagen")
            return
        }

        setSubiendo(true)
        setProgreso(0)
        setProcesandoServidor(false)
        setResultado(null)
        try {
            const formData = new FormData()
            if (zip) formData.append("zip", zip)
            imagenes.forEach((img) => formData.append("fotos", img))

            const data = await subirConProgreso("/api/personas/fotos-masivas", formData, (pct) => {
                setProgreso(pct)
                // Al llegar a 100% de subida, el navegador ya envió todo — lo
                // que sigue (emparejar nombres, subir a MinIO) pasa en el
                // servidor sin más eventos de progreso, así que se muestra un
                // estado indeterminado en vez de dejar la barra pegada en 100%
                // como si ya hubiera terminado.
                if (pct >= 100) setProcesandoServidor(true)
            })

            if (data?.error) throw new Error(data.error)

            setResultado(data)
            const okCount = data.actualizados?.length || 0
            if (okCount > 0) {
                toast.success(`${okCount} foto${okCount === 1 ? "" : "s"} actualizada${okCount === 1 ? "" : "s"}`)
            } else {
                toast.warning("No se actualizó ninguna foto — revisa el detalle abajo")
            }
        } catch (err: any) {
            toast.error(err.message || "Error procesando las fotos")
        } finally {
            setSubiendo(false)
            setProcesandoServidor(false)
            setZip(null)
            setImagenes([])
            if (zipInputRef.current) zipInputRef.current.value = ""
            if (imagenesInputRef.current) imagenesInputRef.current.value = ""
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6 space-y-5">
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Opción 1 — Subir un archivo ZIP</p>
                        <p className="text-xs text-muted-foreground">
                            El ZIP debe contener las imágenes con el nombre exacto de cada persona
                            (ej. <code className="bg-muted px-1 py-0.5 rounded">JUAN PEREZ.jpg</code>).
                        </p>
                        <div className="flex items-center gap-2">
                            <input
                                ref={zipInputRef}
                                type="file"
                                accept=".zip,application/zip,application/x-zip-compressed"
                                className="hidden"
                                disabled={subiendo}
                                onChange={(e) => setZip(e.target.files?.[0] ?? null)}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={subiendo}
                                onClick={() => zipInputRef.current?.click()}
                            >
                                <FileArchive className="mr-2 h-4 w-4" />
                                Seleccionar ZIP
                            </Button>
                            {zip && <span className="text-sm text-muted-foreground">{zip.name}</span>}
                        </div>
                    </div>

                    <div className="border-t pt-5 space-y-2">
                        <p className="text-sm font-medium">Opción 2 — Seleccionar varias imágenes</p>
                        <p className="text-xs text-muted-foreground">
                            Selecciona directamente varios archivos JPEG, PNG o WEBP nombrados igual que la persona.
                        </p>
                        <div className="flex items-center gap-2">
                            <input
                                ref={imagenesInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                className="hidden"
                                disabled={subiendo}
                                onChange={(e) => setImagenes(Array.from(e.target.files ?? []))}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={subiendo}
                                onClick={() => imagenesInputRef.current?.click()}
                            >
                                <Images className="mr-2 h-4 w-4" />
                                Seleccionar imágenes
                            </Button>
                            {imagenes.length > 0 && (
                                <span className="text-sm text-muted-foreground">{imagenes.length} imagen(es) seleccionadas</span>
                            )}
                        </div>
                    </div>

                    <div className="border-t pt-5 space-y-3">
                        <Button type="button" disabled={subiendo || !hayArchivos} onClick={handleProcesar}>
                            {subiendo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            {subiendo ? "Procesando..." : "Subir y actualizar fotos"}
                        </Button>

                        {subiendo && (
                            <div className="space-y-1.5 max-w-sm">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{procesandoServidor ? "Emparejando nombres y guardando fotos..." : "Subiendo archivos..."}</span>
                                    <span>{procesandoServidor ? "" : `${progreso}%`}</span>
                                </div>
                                <Progress value={procesandoServidor ? 100 : progreso} className={procesandoServidor ? "animate-pulse" : undefined} />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {resultado && (
                <Card>
                    <CardContent className="pt-6 space-y-5">
                        <p className="text-sm text-muted-foreground">
                            {resultado.total} archivo{resultado.total === 1 ? "" : "s"} procesado{resultado.total === 1 ? "" : "s"}.
                        </p>

                        {resultado.actualizados.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-500">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Actualizadas ({resultado.actualizados.length})
                                </div>
                                <ul className="text-sm space-y-1 max-h-48 overflow-y-auto pl-6">
                                    {resultado.actualizados.map((r) => (
                                        <li key={r.usuarioId + r.archivo} className="text-muted-foreground">
                                            <span className="text-foreground">{r.archivo}</span> → {r.persona}
                                            {r.via === "cedula" && (
                                                <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">(match por cédula)</span>
                                            )}
                                            {r.via === "sin_sufijo" && (
                                                <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">(match ignorando sufijo numérico del archivo)</span>
                                            )}
                                            {r.via === "sin_tildes" && (
                                                <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">(match ignorando tildes)</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {resultado.sin_coincidencia.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-500">
                                    <HelpCircle className="h-4 w-4" />
                                    Sin coincidencia ({resultado.sin_coincidencia.length})
                                </div>
                                <p className="text-xs text-muted-foreground pl-6">
                                    No se encontró ninguna persona: se probó por nombre exacto, por cédula (si el archivo
                                    se llama con números) y por nombre ignorando tildes.
                                </p>
                                <ul className="text-sm space-y-1 max-h-48 overflow-y-auto pl-6">
                                    {resultado.sin_coincidencia.map((archivo) => (
                                        <li key={archivo} className="text-muted-foreground">{archivo}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {resultado.ambiguos.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-500">
                                    <HelpCircle className="h-4 w-4" />
                                    Varias coincidencias ({resultado.ambiguos.length})
                                </div>
                                <p className="text-xs text-muted-foreground pl-6">
                                    Hay más de una persona con ese nombre exacto — se omitió para no asignar la foto equivocada.
                                </p>
                                <ul className="text-sm space-y-1 max-h-48 overflow-y-auto pl-6">
                                    {resultado.ambiguos.map((a) => (
                                        <li key={a.archivo} className="text-muted-foreground">
                                            {a.archivo} ({a.coincidencias} personas)
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {resultado.errores.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                                    <XCircle className="h-4 w-4" />
                                    Errores ({resultado.errores.length})
                                </div>
                                <ul className="text-sm space-y-1 max-h-48 overflow-y-auto pl-6">
                                    {resultado.errores.map((e) => (
                                        <li key={e.archivo} className="text-muted-foreground">
                                            <span className="text-foreground">{e.archivo}</span> — {e.error}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
