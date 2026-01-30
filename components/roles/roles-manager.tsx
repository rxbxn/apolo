"use client"

import { useState, useEffect, useRef } from "react"
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
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Shield, UserCheck, UserX, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Perfil {
    id: string
    nombre: string
    descripcion: string
    nivel_jerarquico: number
}

interface Usuario {
    id: string
    nombres: string
    apellidos: string
    email: string
    auth_user_id: string | null
    estado: string
    perfil_asignado: Perfil | null
    perfil_id: string | null
    user_role: string | null
    numero_documento: string | null
}

export function RolesManager() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [perfiles, setPerfiles] = useState<Perfil[]>([])
    const [loading, setLoading] = useState(true)
    const [searching, setSearching] = useState(false)
    const [saving, setSaving] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize] = useState(10)
    const [total, setTotal] = useState(0)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const fetchData = async (page = 1, search = "", isSearchRequest = false) => {
        if (isSearchRequest) {
            setSearching(true)
        } else {
            setLoading(true)
        }
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString()
            })
            if (search) params.append('search', search)
            const res = await fetch(`/api/roles?${params.toString()}`)
            if (!res.ok) throw new Error("Error cargando datos")
            const data = await res.json()
            setUsuarios(data.usuarios || [])
            setPerfiles(data.perfiles || [])
            setTotal(data.total || 0)
            setCurrentPage(page)
        } catch (err: any) {
            console.error(err)
            toast.error("Error cargando usuarios y roles")
        } finally {
            setLoading(false)
            setSearching(false)
        }
    }

    useEffect(() => {
        fetchData(currentPage)
    }, [currentPage])

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm)
            setCurrentPage(1) // Reset to first page when searching
            fetchData(1, searchTerm, true) // Indicar que es una búsqueda
        }, 1000) // Aumenté a 1000ms para mejor experiencia de usuario
        return () => clearTimeout(timer)
    }, [searchTerm])

    // Mantener el foco en el input de búsqueda mientras el usuario escribe
    useEffect(() => {
        if (searchInputRef.current && searchTerm && !searching) {
            // Solo enfocamos si hay texto y no está buscando
            const input = searchInputRef.current
            const length = input.value.length
            input.focus()
            input.setSelectionRange(length, length) // Cursor al final
        }
    }, [searchTerm, searching])

    // Indicar si la búsqueda está debounced (con un pequeño delay para UX)
    const [showSearchingIndicator, setShowSearchingIndicator] = useState(false)
    const isSearching = searchTerm !== debouncedSearchTerm

    useEffect(() => {
        if (searching) {
            setShowSearchingIndicator(true)
        } else {
            const timer = setTimeout(() => setShowSearchingIndicator(false), 200)
            return () => clearTimeout(timer)
        }
    }, [searching])

    const handleAssignRole = async (usuario: Usuario, perfilId: string) => {
        if (!perfilId) return
        setSaving(usuario.id)
        try {
            const res = await fetch("/api/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usuario_id: usuario.id,
                    perfil_id: perfilId,
                    auth_user_id: usuario.auth_user_id,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error asignando rol")
            toast.success(data.message || "Rol asignado correctamente")

            // Si se creó una cuenta de autenticación, mostrar información adicional
            if (data.auth_created) {
                toast.info(`Se creó una cuenta de autenticación para ${usuario.nombres}. La contraseña es su número de documento: ${usuario.numero_documento || 'N/A'}`, {
                    duration: 10000, // Mostrar por más tiempo
                })
            }

            fetchData(currentPage)
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Error asignando rol")
        } finally {
            setSaving(null)
        }
    }

    const handleRemoveRole = async (usuario: Usuario) => {
        if (!confirm(`¿Seguro que deseas quitar el rol de ${usuario.nombres}?`)) return
        setSaving(usuario.id)
        try {
            const params = new URLSearchParams({ usuario_id: usuario.id })
            if (usuario.auth_user_id) params.append("auth_user_id", usuario.auth_user_id)
            const res = await fetch(`/api/roles?${params.toString()}`, {
                method: "DELETE",
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error quitando rol")
            toast.success(data.message || "Rol removido correctamente")
            fetchData(currentPage)
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Error quitando rol")
        } finally {
            setSaving(null)
        }
    }

    const filteredUsuarios = usuarios

    const getRoleBadgeColor = (nivelJerarquico?: number) => {
        if (nivelJerarquico === undefined || nivelJerarquico === null) return "secondary"
        if (nivelJerarquico === 0) return "destructive" // Super Admin
        if (nivelJerarquico <= 2) return "default"      // Alto nivel
        if (nivelJerarquico <= 4) return "outline"      // Medio
        return "secondary"                              // Bajo
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2">Cargando usuarios...</span>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    <span className="text-sm text-muted-foreground">
                        {total} usuarios totales • {perfiles.length} roles disponibles
                    </span>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                    setSearchTerm("")
                    setDebouncedSearchTerm("")
                    setCurrentPage(1)
                    fetchData(1, "")
                }}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refrescar
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Input
                    ref={searchInputRef}
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-8"
                />
                {showSearchingIndicator && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Buscando...</span>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol Actual</TableHead>
                            <TableHead>Asignar Rol</TableHead>
                            <TableHead>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsuarios.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                    {searching ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Buscando...</span>
                                        </div>
                                    ) : debouncedSearchTerm ? (
                                        `No se encontraron usuarios para "${debouncedSearchTerm}"`
                                    ) : (
                                        "No se encontraron usuarios"
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsuarios.map((usuario) => (
                                <TableRow key={usuario.id}>
                                    <TableCell>
                                        <div className="font-medium">
                                            {usuario.nombres} {usuario.apellidos}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            ID: {usuario.id.slice(0, 8)}...
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">{usuario.email || "—"}</span>
                                    </TableCell>
                                    <TableCell>
                                        {usuario.perfil_asignado ? (
                                            <Badge variant={getRoleBadgeColor(usuario.perfil_asignado.nivel_jerarquico) as any}>
                                                {usuario.perfil_asignado.nombre}
                                            </Badge>
                                        ) : usuario.user_role ? (
                                            <Badge variant="outline">{usuario.user_role}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">Sin rol</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={usuario.perfil_id || ""}
                                            onValueChange={(val) => handleAssignRole(usuario, val)}
                                            disabled={saving === usuario.id}
                                        >
                                            <SelectTrigger className="w-48">
                                                <SelectValue placeholder="Seleccionar rol..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {perfiles.map((perfil) => (
                                                    <SelectItem key={perfil.id} value={perfil.id}>
                                                        {perfil.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            {saving === usuario.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : usuario.perfil_asignado || usuario.user_role ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveRole(usuario)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <UserX className="h-4 w-4 mr-1" />
                                                    Quitar
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground flex items-center">
                                                    <UserCheck className="h-4 w-4 mr-1" />
                                                    Listo
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {total > pageSize && (
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                        Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, total)} de {total} usuarios
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            Anterior
                        </Button>
                        <span className="text-sm">
                            Página {currentPage} de {Math.ceil(total / pageSize)}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(total / pageSize), prev + 1))}
                            disabled={currentPage === Math.ceil(total / pageSize)}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}

            {/* Roles legend */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium mb-2">Roles disponibles:</p>
                <div className="flex flex-wrap gap-2">
                    {perfiles.map((p) => (
                        <Badge key={p.id} variant={getRoleBadgeColor(p.nivel_jerarquico) as any}>
                            {p.nombre} (Nivel {p.nivel_jerarquico})
                        </Badge>
                    ))}
                </div>
            </div>
        </div>
    )
}
