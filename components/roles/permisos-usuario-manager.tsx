"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Loader2, UserCog, Save, CheckSquare, Square, ChevronsUpDown, Check } from "lucide-react"

interface Usuario {
    id: string
    nombres: string
    apellidos: string
    email: string
    perfil_asignado: { nombre: string } | null
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

// Segunda pestaña de "por rol": acá se le da a un usuario PUNTUAL acceso a
// módulos adicionales, sin tocar su perfil ni afectar a nadie más que tenga
// el mismo rol. Lo que ya tiene por su perfil se muestra atenuado/marcado
// como referencia, pero se edita en la pestaña "Permisos por rol".
export function PermisosUsuarioManager() {
    const [busqueda, setBusqueda] = useState("")
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [buscando, setBuscando] = useState(false)
    const [open, setOpen] = useState(false)

    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null)
    const [modulos, setModulos] = useState<Modulo[]>([])
    const [permisos, setPermisos] = useState<Permiso[]>([])
    // Clave "moduloId:permisoId" -> true si está marcado como permiso PUNTUAL
    const [matriz, setMatriz] = useState<Record<string, boolean>>({})
    // Lo que ya tiene por su perfil (solo lectura, para no confundir)
    const [porPerfil, setPorPerfil] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [huboCambios, setHuboCambios] = useState(false)

    // Se dispara al escribir Y al abrir el combobox, para que ya se vea una
    // lista inicial (los primeros 15 por nombre) sin tener que escribir nada.
    useEffect(() => {
        if (!open) return

        const timer = setTimeout(async () => {
            setBuscando(true)
            try {
                const params = new URLSearchParams({ pageSize: "15" })
                if (busqueda.trim()) params.append("search", busqueda.trim())
                const res = await fetch(`/api/roles?${params.toString()}`)
                const data = await res.json()
                setUsuarios(data.usuarios || [])
            } catch (err) {
                console.error("Error buscando usuarios:", err)
            } finally {
                setBuscando(false)
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [busqueda, open])

    const cargarMatriz = useCallback(async (usuarioId: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/roles/permisos-usuario?usuario_id=${usuarioId}`)
            if (!res.ok) throw new Error("Error cargando permisos")
            const data = await res.json()
            setModulos(data.modulos || [])
            setPermisos(data.permisos || [])
            const m: Record<string, boolean> = {}
            for (const a of data.asignaciones || []) {
                m[`${a.modulo_id}:${a.permiso_id}`] = true
            }
            setMatriz(m)
            const porPerfilSet = new Set<string>(
                (data.modulosPorPerfil || []).map((p: any) => `${p.modulo_id}:${p.permiso_id}`)
            )
            setPorPerfil(porPerfilSet)
            setHuboCambios(false)
        } catch (err: any) {
            console.error(err)
            toast.error("Error cargando los permisos del usuario")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (usuarioSeleccionado) {
            cargarMatriz(usuarioSeleccionado.id)
        } else {
            setModulos([])
            setPermisos([])
            setMatriz({})
            setPorPerfil(new Set())
        }
    }, [usuarioSeleccionado, cargarMatriz])

    function toggleCelda(moduloId: string, permisoId: string) {
        const key = `${moduloId}:${permisoId}`
        if (porPerfil.has(key)) return // ya lo tiene por su rol, no aplica marcarlo aparte
        setMatriz((prev) => ({ ...prev, [key]: !prev[key] }))
        setHuboCambios(true)
    }

    function toggleFila(moduloId: string) {
        const celdasEditables = permisos.filter((p) => !porPerfil.has(`${moduloId}:${p.id}`))
        const todasMarcadas = celdasEditables.length > 0 && celdasEditables.every((p) => matriz[`${moduloId}:${p.id}`])
        setMatriz((prev) => {
            const next = { ...prev }
            for (const p of celdasEditables) {
                next[`${moduloId}:${p.id}`] = !todasMarcadas
            }
            return next
        })
        setHuboCambios(true)
    }

    async function guardar() {
        if (!usuarioSeleccionado) return
        setSaving(true)
        try {
            const asignaciones = Object.entries(matriz)
                .filter(([, marcado]) => marcado)
                .map(([key]) => {
                    const [modulo_id, permiso_id] = key.split(":")
                    return { modulo_id, permiso_id }
                })

            const res = await fetch("/api/roles/permisos-usuario", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuario_id: usuarioSeleccionado.id, asignaciones }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error guardando permisos")
            toast.success("Permisos del usuario actualizados correctamente")
            setHuboCambios(false)
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Error guardando permisos")
        } finally {
            setSaving(false)
        }
    }

    const nombreUsuario = usuarioSeleccionado
        ? `${usuarioSeleccionado.nombres || ""} ${usuarioSeleccionado.apellidos || ""}`.trim()
        : ""

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                <span className="text-sm text-muted-foreground">
                    Dale a un usuario puntual acceso a módulos adicionales, sin cambiar su rol ni afectar a otros usuarios con el mismo perfil.
                </span>
            </div>

            <div className="max-w-sm">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                            <span className={cn(!usuarioSeleccionado && "text-muted-foreground")}>
                                {usuarioSeleccionado ? `${nombreUsuario} (${usuarioSeleccionado.email})` : "Buscar usuario..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Buscar por nombre o email..."
                                value={busqueda}
                                onValueChange={setBusqueda}
                            />
                            <CommandEmpty>
                                {buscando ? "Buscando..." : "No se encontraron usuarios"}
                            </CommandEmpty>
                            <CommandGroup>
                                {usuarios.map((u) => (
                                    <CommandItem
                                        key={u.id}
                                        value={`${u.nombres} ${u.apellidos} ${u.email}`}
                                        onSelect={() => {
                                            setUsuarioSeleccionado(u)
                                            setOpen(false)
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                usuarioSeleccionado?.id === u.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span>{u.nombres} {u.apellidos}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {u.email}{u.perfil_asignado?.nombre ? ` · ${u.perfil_asignado.nombre}` : ""}
                                            </span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {!usuarioSeleccionado && (
                <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
                    Busca y selecciona un usuario para darle permisos puntuales.
                </div>
            )}

            {usuarioSeleccionado && loading && (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {usuarioSeleccionado && !loading && modulos.length > 0 && (
                <>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary">Sombreado</Badge>
                        <span>= ya lo tiene por su rol ({usuarioSeleccionado.perfil_asignado?.nombre || "sin rol"}). Se edita en la pestaña &quot;Permisos por rol&quot;.</span>
                    </div>

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
                                    const celdasEditables = permisos.filter((p) => !porPerfil.has(`${modulo.id}:${p.id}`))
                                    const todasMarcadas = celdasEditables.length > 0 && celdasEditables.every((p) => matriz[`${modulo.id}:${p.id}`])
                                    return (
                                        <TableRow key={modulo.id}>
                                            <TableCell className="font-medium">{modulo.nombre}</TableCell>
                                            {permisos.map((permiso) => {
                                                const key = `${modulo.id}:${permiso.id}`
                                                const yaPorPerfil = porPerfil.has(key)
                                                return (
                                                    <TableCell
                                                        key={permiso.id}
                                                        className={cn("text-center", yaPorPerfil && "bg-muted")}
                                                    >
                                                        <Checkbox
                                                            checked={yaPorPerfil || !!matriz[key]}
                                                            disabled={yaPorPerfil}
                                                            onCheckedChange={() => toggleCelda(modulo.id, permiso.id)}
                                                        />
                                                    </TableCell>
                                                )
                                            })}
                                            <TableCell className="text-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => toggleFila(modulo.id)}
                                                    disabled={celdasEditables.length === 0}
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
                            Guardar permisos del usuario
                        </Button>
                    </div>
                </>
            )}

            {usuarioSeleccionado && !loading && modulos.length === 0 && (
                <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
                    No hay módulos activos configurados en el sistema.
                </div>
            )}
        </div>
    )
}
