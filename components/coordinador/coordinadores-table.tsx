"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Search, Edit, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { useCoordinadores } from "@/lib/hooks/use-coordinadores"
import { usePermisos } from "@/lib/hooks/use-permisos"
import { useConfirm } from "@/lib/hooks/use-confirm"
import { toast } from "sonner"

const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        activo: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
        inactivo: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
        suspendido: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    }
    return colors[status] || colors.inactivo
}

export function CoordinadoresTable() {
    const router = useRouter()
    const { listar, eliminar, loading } = useCoordinadores()
    const { permisos } = usePermisos("Módulo Coordinador")
    const { confirm, isOpen, config, handleConfirm, handleCancel, setIsOpen } = useConfirm()

    const [coordinadores, setCoordinadores] = useState<any[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Filtros
    const [search, setSearch] = useState("")
    const [estadoFilter, setEstadoFilter] = useState<string>("todos")

    const pageSize = 10

    useEffect(() => {
        cargarCoordinadores()
    }, [currentPage, search, estadoFilter])

    async function cargarCoordinadores() {
        try {
            const filtros: any = {}

            if (search) filtros.busqueda = search
            if (estadoFilter !== "todos") filtros.estado = estadoFilter

            const result = await listar(filtros, currentPage, pageSize)

            setCoordinadores(result.data)
            setTotalCount(result.count)
            setTotalPages(result.totalPages)
        } catch (error) {
            console.error("Error cargando coordinadores:", error)
            toast.error("Error al cargar coordinadores")
        }
    }

    async function handleEliminar(id: string, nombre: string) {
        const confirmed = await confirm({
            title: "Eliminar Coordinador",
            description: `¿Estás seguro de eliminar al coordinador ${nombre}? Esta acción no se puede deshacer y también eliminará su acceso al sistema.`,
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            variant: "destructive"
        })

        if (!confirmed) return

        try {
            await eliminar(id)
            toast.success("Coordinador eliminado exitosamente")
            cargarCoordinadores()
        } catch (error) {
            console.error("Error eliminando coordinador:", error)
            toast.error("Error al eliminar coordinador")
        }
    }

    if (!permisos?.leer) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No tienes permisos para ver este módulo</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, documento o email..."
                        className="pl-10"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setCurrentPage(1)
                        }}
                    />
                </div>

                <Select
                    value={estadoFilter}
                    onValueChange={(value) => {
                        setEstadoFilter(value)
                        setCurrentPage(1)
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos los estados</SelectItem>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                        <SelectItem value="suspendido">Suspendido</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tabla */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : coordinadores.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            No se encontraron coordinadores
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/50">
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                                                Nombre
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                                                Email
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                                                Rol
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                                                Referencia
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                                                Estado
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {coordinadores.map((coordinador) => (
                                            <tr
                                                key={coordinador.coordinador_id}
                                                className="border-b border-border hover:bg-muted/50 transition-colors"
                                            >
                                                <td className="px-6 py-4 text-sm text-foreground">
                                                    <div>{coordinador.nombres || coordinador.email || 'Sin nombre'}{coordinador.apellidos ? ` ${coordinador.apellidos}` : ''}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {coordinador.tipo_documento} {coordinador.numero_documento}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-foreground">
                                                    {coordinador.email}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-foreground">
                                                    {coordinador.rol || "-"}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground">
                                                    {coordinador.referencia_nombre || "-"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge className={getStatusColor(coordinador.estado)}>{coordinador.estado}</Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        {permisos?.actualizar && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="w-8 h-8 text-muted-foreground hover:text-foreground"
                                                                onClick={() => {
                                                                    const id = coordinador.coordinador_id
                                                                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                                                                    if (!id || !uuidRegex.test(id)) {
                                                                        toast.error('ID de coordinador inválido')
                                                                        return
                                                                    }
                                                                    router.push(`/dashboard/coordinador/${id}`)
                                                                }}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        {permisos?.eliminar && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="w-8 h-8 text-destructive hover:bg-destructive/10"
                                                                onClick={() =>
                                                                    handleEliminar(
                                                                        coordinador.email,
                                                                        `${coordinador.nombres} ${coordinador.apellidos}`
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación */}
                            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                                <div className="text-sm text-muted-foreground">
                                    Mostrando {(currentPage - 1) * pageSize + 1} a{" "}
                                    {Math.min(currentPage * pageSize, totalCount)} de {totalCount} coordinadores
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Siguiente
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Confirmación */}
            {config && (
                <ConfirmDialog
                    open={isOpen}
                    onOpenChange={setIsOpen}
                    title={config.title}
                    description={config.description}
                    confirmText={config.confirmText}
                    cancelText={config.cancelText}
                    variant={config.variant}
                    onConfirm={handleConfirm}
                />
            )}
        </div>
    )
}
