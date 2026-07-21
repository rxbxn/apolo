"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Loader2, ShieldPlus, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Perfil {
    id: string
    nombre: string
    descripcion: string | null
    nivel_jerarquico: number | null
}

// Crea perfiles (roles) nuevos directamente desde la UI, sin necesitar un
// script SQL — todo el resto del sistema (permisos por módulo, asignación a
// usuarios) ya es dinámico y lee de la tabla `perfiles`, así que un rol
// creado aquí queda disponible de inmediato en las otras pestañas.
export function CrearRolManager() {
    const [perfiles, setPerfiles] = useState<Perfil[]>([])
    const [loading, setLoading] = useState(true)
    const [nombre, setNombre] = useState("")
    const [descripcion, setDescripcion] = useState("")
    const [nivelJerarquico, setNivelJerarquico] = useState("5")
    const [submitting, setSubmitting] = useState(false)
    const [eliminando, setEliminando] = useState<string | null>(null)

    const cargar = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/roles/permisos")
            const data = await res.json()
            setPerfiles(data.perfiles || [])
        } catch (err) {
            console.error("Error cargando roles:", err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        cargar()
    }, [cargar])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!nombre.trim()) {
            toast.error("Escribe un nombre para el rol")
            return
        }
        setSubmitting(true)
        try {
            const res = await fetch("/api/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    crear_rol: true,
                    nombre: nombre.trim(),
                    descripcion: descripcion.trim() || null,
                    nivel_jerarquico: Number(nivelJerarquico),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error creando el rol")
            toast.success(`Rol "${nombre.trim()}" creado. Ya puedes asignarle módulos en "Permisos por rol".`)
            setNombre("")
            setDescripcion("")
            setNivelJerarquico("5")
            cargar()
        } catch (err: any) {
            toast.error(err.message || "Error creando el rol")
        } finally {
            setSubmitting(false)
        }
    }

    async function eliminarRol(perfil: Perfil) {
        if (!confirm(`¿Eliminar el rol "${perfil.nombre}"? Solo se puede si nadie lo tiene asignado.`)) return
        setEliminando(perfil.id)
        try {
            const res = await fetch(`/api/roles?perfil_id=${perfil.id}`, { method: "DELETE" })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error eliminando el rol")
            toast.success("Rol eliminado")
            cargar()
        } catch (err: any) {
            toast.error(err.message || "Error eliminando el rol")
        } finally {
            setEliminando(null)
        }
    }

    return (
        <div className="space-y-8">
            <Card className="border-none shadow-none">
                <CardHeader className="px-0 pt-0">
                    <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl text-primary">Crear rol nuevo</CardTitle>
                        <ShieldPlus className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardDescription>
                        Ej: "Verificador de Sticker". Después de crearlo, ve a "Permisos por rol" para darle acceso
                        solo a los módulos que necesita.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="nombre-rol" className="text-muted-foreground font-normal">Nombre del rol</Label>
                            <Input
                                id="nombre-rol"
                                placeholder="ej: Verificador de Sticker"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                className="border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 shadow-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="descripcion-rol" className="text-muted-foreground font-normal">Descripción (opcional)</Label>
                            <Input
                                id="descripcion-rol"
                                placeholder="Para qué sirve este rol"
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                className="border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 shadow-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nivel-rol" className="text-muted-foreground font-normal">
                                Nivel jerárquico
                            </Label>
                            <Input
                                id="nivel-rol"
                                type="number"
                                min={0}
                                max={10}
                                value={nivelJerarquico}
                                onChange={(e) => setNivelJerarquico(e.target.value)}
                                className="border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 shadow-none"
                            />
                            <p className="text-xs text-muted-foreground">0 = más alto (Super Admin). Mientras más alto el número, menor jerarquía.</p>
                        </div>
                        <div className="md:col-span-3 flex justify-end">
                            <Button type="submit" disabled={submitting} className="bg-[#0F4C81] hover:bg-[#0F4C81]/90 text-white">
                                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldPlus className="w-4 h-4 mr-2" />}
                                {submitting ? "CREANDO..." : "CREAR ROL"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <p className="text-sm font-medium">Roles existentes</p>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Nivel</TableHead>
                                <TableHead className="w-24">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : perfiles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                        No hay roles creados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                perfiles.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.nombre}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{p.descripcion || "—"}</TableCell>
                                        <TableCell>{p.nivel_jerarquico ?? "—"}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => eliminarRol(p)}
                                                disabled={eliminando === p.id}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                {eliminando === p.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
