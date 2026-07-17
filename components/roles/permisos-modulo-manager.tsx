"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, ShieldCheck, Save, CheckSquare, Square } from "lucide-react"

interface Perfil {
    id: string
    nombre: string
    descripcion: string | null
    nivel_jerarquico: number | null
}

interface Modulo {
    id: string
    nombre: string
    descripcion: string | null
    ruta: string | null
    activo: boolean
    orden: number | null
}

interface Permiso {
    id: string
    nombre: string
    codigo: string
    descripcion: string | null
}

interface PermisosModuloManagerProps {
    perfiles: Perfil[]
}

export function PermisosModuloManager({ perfiles }: PermisosModuloManagerProps) {
    const [perfilSeleccionado, setPerfilSeleccionado] = useState<string>("")
    const [modulos, setModulos] = useState<Modulo[]>([])
    const [permisos, setPermisos] = useState<Permiso[]>([])
    // Clave "moduloId:permisoId" -> true si está marcado
    const [matriz, setMatriz] = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [huboCambios, setHuboCambios] = useState(false)

    const perfilActual = perfiles.find((p) => p.id === perfilSeleccionado)
    const esSuperAdmin = perfilActual?.nombre?.toLowerCase() === "super admin"

    const cargarMatriz = useCallback(async (perfilId: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/roles/permisos?perfil_id=${perfilId}`)
            if (!res.ok) throw new Error("Error cargando permisos")
            const data = await res.json()
            setModulos(data.modulos || [])
            setPermisos(data.permisos || [])
            const m: Record<string, boolean> = {}
            for (const a of data.asignaciones || []) {
                m[`${a.modulo_id}:${a.permiso_id}`] = true
            }
            setMatriz(m)
            setHuboCambios(false)
        } catch (err: any) {
            console.error(err)
            toast.error("Error cargando la matriz de permisos")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (perfilSeleccionado) {
            cargarMatriz(perfilSeleccionado)
        } else {
            setModulos([])
            setPermisos([])
            setMatriz({})
        }
    }, [perfilSeleccionado, cargarMatriz])

    function toggleCelda(moduloId: string, permisoId: string) {
        const key = `${moduloId}:${permisoId}`
        setMatriz((prev) => ({ ...prev, [key]: !prev[key] }))
        setHuboCambios(true)
    }

    function toggleFila(moduloId: string) {
        const todasMarcadas = permisos.every((p) => matriz[`${moduloId}:${p.id}`])
        setMatriz((prev) => {
            const next = { ...prev }
            for (const p of permisos) {
                next[`${moduloId}:${p.id}`] = !todasMarcadas
            }
            return next
        })
        setHuboCambios(true)
    }

    async function guardar() {
        if (!perfilSeleccionado) return
        setSaving(true)
        try {
            const asignaciones = Object.entries(matriz)
                .filter(([, marcado]) => marcado)
                .map(([key]) => {
                    const [modulo_id, permiso_id] = key.split(":")
                    return { modulo_id, permiso_id }
                })

            const res = await fetch("/api/roles/permisos", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ perfil_id: perfilSeleccionado, asignaciones }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error guardando permisos")
            toast.success("Permisos del rol actualizados correctamente")
            setHuboCambios(false)
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Error guardando permisos")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm text-muted-foreground">
                    Define a qué módulos y con qué permisos tiene acceso cada rol. Los cambios aplican a todos los usuarios que tengan ese rol asignado.
                </span>
            </div>

            <div className="max-w-xs">
                <Select value={perfilSeleccionado} onValueChange={setPerfilSeleccionado}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un rol..." />
                    </SelectTrigger>
                    <SelectContent>
                        {perfiles.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.nombre}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {!perfilSeleccionado && (
                <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
                    Selecciona un rol para configurar sus permisos por módulo.
                </div>
            )}

            {perfilSeleccionado && esSuperAdmin && (
                <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg bg-muted/30">
                    <Badge variant="destructive" className="mb-2">Super Admin</Badge>
                    <p>El rol Super Admin siempre tiene acceso total a todos los módulos y no requiere configuración.</p>
                </div>
            )}

            {perfilSeleccionado && !esSuperAdmin && loading && (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {perfilSeleccionado && !esSuperAdmin && !loading && modulos.length > 0 && (
                <>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-40">Módulo</TableHead>
                                    {permisos.map((p) => (
                                        <TableHead key={p.id} className="text-center whitespace-nowrap">
                                            {p.nombre || p.codigo}
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-center whitespace-nowrap">Todos</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {modulos.map((modulo) => {
                                    const todasMarcadas = permisos.length > 0 && permisos.every((p) => matriz[`${modulo.id}:${p.id}`])
                                    return (
                                        <TableRow key={modulo.id}>
                                            <TableCell className="font-medium">{modulo.nombre}</TableCell>
                                            {permisos.map((permiso) => (
                                                <TableCell key={permiso.id} className="text-center">
                                                    <Checkbox
                                                        checked={!!matriz[`${modulo.id}:${permiso.id}`]}
                                                        onCheckedChange={() => toggleCelda(modulo.id, permiso.id)}
                                                    />
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => toggleFila(modulo.id)}
                                                    title={todasMarcadas ? "Quitar todos" : "Marcar todos"}
                                                >
                                                    {todasMarcadas ? (
                                                        <CheckSquare className="h-4 w-4" />
                                                    ) : (
                                                        <Square className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={guardar} disabled={saving || !huboCambios}>
                            {saving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Guardar permisos
                        </Button>
                    </div>
                </>
            )}

            {perfilSeleccionado && !esSuperAdmin && !loading && modulos.length === 0 && (
                <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
                    No hay módulos activos configurados en el sistema.
                </div>
            )}
        </div>
    )
}
