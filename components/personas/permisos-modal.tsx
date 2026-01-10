"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Shield } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface PermisosModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    persona: {
        id: string
        nombres: string
        apellidos: string
    }
}

interface Perfil {
    id: string
    nombre: string
    descripcion: string
}

interface PerfilAsignado {
    perfil_id: string
    es_principal: boolean
}

export function PermisosModal({ open, onOpenChange, persona }: PermisosModalProps) {
    const [perfiles, setPerfiles] = useState<Perfil[]>([])
    const [perfilesAsignados, setPerfilesAsignados] = useState<string[]>([])
    const [perfilPrincipal, setPerfilPrincipal] = useState<string>("")
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open) {
            cargarDatos()
        }
    }, [open, persona.id])

    async function cargarDatos() {
        setLoading(true)
        try {
            // Cargar todos los perfiles disponibles
            const { data: perfilesData, error: perfilesError } = await supabase
                .from("perfiles")
                .select("*")
                .eq("activo", true)
                .order("nivel_jerarquico")

            if (perfilesError) throw perfilesError
            setPerfiles(perfilesData || [])

            // Cargar perfiles ya asignados a esta persona
            const { data: asignados, error: asignadosError } = await supabase
                .from("usuario_perfil")
                .select("perfil_id, es_principal")
                .eq("usuario_id", persona.id)
                .eq("activo", true) as { data: PerfilAsignado[] | null, error: any }

            if (asignadosError) throw asignadosError

            const idsAsignados = asignados?.map((a: PerfilAsignado) => a.perfil_id) || []
            setPerfilesAsignados(idsAsignados)

            const principal = asignados?.find((a: PerfilAsignado) => a.es_principal)
            if (principal) {
                setPerfilPrincipal(principal.perfil_id)
            }
        } catch (error) {
            console.error("Error cargando datos:", error)
            toast.error("Error al cargar perfiles")
        } finally {
            setLoading(false)
        }
    }

    function togglePerfil(perfilId: string) {
        if (perfilesAsignados.includes(perfilId)) {
            // Si es el principal y se va a quitar, resetear principal
            if (perfilPrincipal === perfilId) {
                setPerfilPrincipal("")
            }
            setPerfilesAsignados(perfilesAsignados.filter((id) => id !== perfilId))
        } else {
            setPerfilesAsignados([...perfilesAsignados, perfilId])
            // Si es el primer perfil, hacerlo principal automáticamente
            if (perfilesAsignados.length === 0) {
                setPerfilPrincipal(perfilId)
            }
        }
    }

    function setPrincipal(perfilId: string) {
        // Solo puede ser principal si está asignado
        if (perfilesAsignados.includes(perfilId)) {
            setPerfilPrincipal(perfilId)
        }
    }

    async function guardarPermisos() {
        if (perfilesAsignados.length === 0) {
            toast.error("Debe asignar al menos un perfil")
            return
        }

        if (!perfilPrincipal) {
            toast.error("Debe seleccionar un perfil principal")
            return
        }

        setSaving(true)
        try {
            // 1. Desactivar todos los perfiles actuales
            // @ts-ignore - tabla usuario_perfil no está en los tipos generados
            await (supabase
                .from("usuario_perfil")
                .update({ activo: false })
                .eq("usuario_id", persona.id))

            // 2. Insertar/actualizar los perfiles seleccionados
            const perfilesData = perfilesAsignados.map((perfilId) => ({
                usuario_id: persona.id,
                perfil_id: perfilId,
                es_principal: perfilId === perfilPrincipal,
                activo: true,
                fecha_asignacion: new Date().toISOString(),
            }))

            // @ts-ignore - tabla usuario_perfil no está en los tipos generados
            const { error } = await supabase.from("usuario_perfil").upsert(perfilesData, {
                onConflict: "usuario_id,perfil_id",
            })

            if (error) throw error

            toast.success("Permisos actualizados correctamente")
            onOpenChange(false)
        } catch (error) {
            console.error("Error guardando permisos:", error)
            toast.error("Error al guardar permisos")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <DialogTitle>Gestionar Permisos</DialogTitle>
                    </div>
                    <DialogDescription>
                        Asigne roles y permisos a <strong>{persona.nombres} {persona.apellidos}</strong>
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Lista de perfiles */}
                        <div className="space-y-4">
                            <Label className="text-base font-semibold">Perfiles/Roles Disponibles</Label>
                            <div className="space-y-3">
                                {perfiles.map((perfil) => {
                                    const isAsignado = perfilesAsignados.includes(perfil.id)
                                    const isPrincipal = perfilPrincipal === perfil.id

                                    return (
                                        <div
                                            key={perfil.id}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    id={`perfil-${perfil.id}`}
                                                    checked={isAsignado}
                                                    onCheckedChange={() => togglePerfil(perfil.id)}
                                                />
                                                <div className="flex-1">
                                                    <Label
                                                        htmlFor={`perfil-${perfil.id}`}
                                                        className="cursor-pointer font-medium"
                                                    >
                                                        {perfil.nombre}
                                                    </Label>
                                                    {perfil.descripcion && (
                                                        <p className="text-sm text-muted-foreground">
                                                            {perfil.descripcion}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {isAsignado && (
                                                <Button
                                                    type="button"
                                                    variant={isPrincipal ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setPrincipal(perfil.id)}
                                                >
                                                    {isPrincipal ? "✓ Principal" : "Hacer Principal"}
                                                </Button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Permisos por módulo se heredan del perfil */}
                        {perfilesAsignados.length > 0 && (
                            <div className="p-4 bg-muted/30 rounded-lg border">
                                <p className="text-sm text-muted-foreground">
                                    <strong>Nota:</strong> Los permisos específicos de módulos (crear, leer, actualizar,
                                    eliminar, etc.) se heredan automáticamente según el perfil asignado. Puede revisar
                                    los permisos de cada perfil en la sección de Administración.
                                </p>
                            </div>
                        )}

                        {/* Botones de acción */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={guardarPermisos} disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
