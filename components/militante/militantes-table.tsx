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
import { useMilitantes } from "@/lib/hooks/use-militantes"
import { usePermisos } from "@/lib/hooks/use-permisos"
import { useConfirm } from "@/lib/hooks/use-confirm"
import { useCoordinadores } from "@/lib/hooks/use-coordinadores"
import { useTiposMilitante } from "@/lib/hooks/use-tipos-militante"
import { toast } from "sonner"

const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        activo: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
        inactivo: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
        suspendido: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    }
    return colors[status] || colors.inactivo
}

export function MilitantesTable() {
    const router = useRouter()
    const { listar, eliminar, loading: militantesLoading } = useMilitantes()
    const { permisos, loading: permisosLoading } = usePermisos("Módulo Militante")
    const { confirm, isOpen, config, handleConfirm, handleCancel, setIsOpen } = useConfirm()
    const { listar: listarCoordinadores } = useCoordinadores()
    const { listar: listarTiposMilitante } = useTiposMilitante()

    const [militantes, setMilitantes] = useState<any[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Filtros
    const [search, setSearch] = useState("")
    const [estadoFilter, setEstadoFilter] = useState<string>("todos")
    const [tipoFilter, setTipoFilter] = useState<string>("todos")
    const [coordinadorFilter, setCoordinadorFilter] = useState<string>("todos")

    // Datos para filtros
    const [coordinadores, setCoordinadores] = useState<any[]>([])
    const [tiposMilitante, setTiposMilitante] = useState<any[]>([])

    const pageSize = 5

    // Función para limpiar filtros
    const limpiarFiltros = () => {
        setSearch("")
        setEstadoFilter("todos")
        setTipoFilter("todos")
        setCoordinadorFilter("todos")
        setCurrentPage(1)
    }

    // Cargar datos iniciales
    useEffect(() => {
        cargarDatosIniciales()
    }, [])

    useEffect(() => {
        cargarMilitantes()
    }, [currentPage, search, estadoFilter, tipoFilter, coordinadorFilter])

    async function cargarDatosIniciales() {
        try {
            const [coordsResult, tiposResult] = await Promise.all([
                listarCoordinadores(),
                listarTiposMilitante()
            ])
            setCoordinadores(coordsResult?.data || [])
            setTiposMilitante(tiposResult?.data || [])
        } catch (error) {
            console.error("Error cargando datos iniciales:", error)
            // En caso de error, asegurarse de que sean arrays vacíos
            setCoordinadores([])
            setTiposMilitante([])
        }
    }

    async function cargarMilitantes() {
        try {
            const filtros: any = {}

            if (search) filtros.busqueda = search
            if (estadoFilter !== "todos") filtros.estado = estadoFilter
            if (tipoFilter !== "todos") filtros.tipo = tipoFilter
            if (coordinadorFilter !== "todos") filtros.coordinador_id = coordinadorFilter

            const result = await listar(filtros, currentPage, pageSize)

            setMilitantes(result.data)
            setTotalCount(result.count)
            setTotalPages(result.totalPages)
        } catch (error) {
            console.error("Error cargando militantes:", error)
            toast.error("Error al cargar militantes")
        }
    }

    async function handleEliminar(id: string, nombre: string) {
        const confirmed = await confirm({
            title: "Eliminar Militante",
            description: `¿Estás seguro de eliminar a ${nombre}? Esta acción no se puede deshacer.`,
            confirmText: "Eliminar",
            cancelText: "Cancelar", 
            variant: "destructive"
        })

        if (!confirmed) return

        try {
            await eliminar(id)
            toast.success("Militante eliminado exitosamente")
            cargarMilitantes()
        } catch (error) {
            console.error("Error eliminando militante:", error)
            toast.error("Error al eliminar militante")
        }
    }

    if (permisosLoading || !permisos) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verificando permisos...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!permisos.leer) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No tienes permisos para ver este módulo</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
            <CardContent className="p-6">
                <div className="space-y-4">
                    {/* Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="Buscar por nombre o documento..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="pl-10"
                            />
                        </div>
                        <Select value={estadoFilter} onValueChange={(value) => {
                            setEstadoFilter(value)
                            setCurrentPage(1)
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos los estados</SelectItem>
                                <SelectItem value="activo">Activo</SelectItem>
                                <SelectItem value="inactivo">Inactivo</SelectItem>
                                <SelectItem value="suspendido">Suspendido</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={tipoFilter} onValueChange={(value) => {
                            setTipoFilter(value)
                            setCurrentPage(1)
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos los tipos</SelectItem>
                                {tiposMilitante.map((tipo) => (
                                    <SelectItem key={tipo.id} value={tipo.id}>
                                        {tipo.descripcion}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={coordinadorFilter} onValueChange={(value) => {
                            setCoordinadorFilter(value)
                            setCurrentPage(1)
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por coordinador" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos los coordinadores</SelectItem>
                                {coordinadores.map((coord) => (
                                    <SelectItem key={coord.id} value={coord.id}>
                                        {coord.nombre || coord.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Botón limpiar filtros */}
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={limpiarFiltros}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Limpiar filtros
                        </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Persona</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Coordinador</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Perfil</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {militantesLoading ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                            </td>
                                        </tr>
                                    ) : militantes.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                                No se encontraron militantes
                                            </td>
                                        </tr>
                                    ) : (
                                        militantes.map((militante) => (
                                            <tr key={militante.militante_id} className="border-t hover:bg-muted/50">
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <div className="font-medium">
                                                            {militante.nombres} {militante.apellidos}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {militante.numero_documento}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm">{militante.tipo_codigo ?? militante.tipo_descripcion ?? militante.tipo}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    {militante.coordinador_nombre || militante.coordinador_email || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {militante.perfil_nombre || "-"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge className={getStatusColor(militante.estado)}>
                                                        {militante.estado}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {permisos?.actualizar && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => router.push(`/dashboard/militante/${militante.militante_id}`)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {permisos?.eliminar && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEliminar(militante.militante_id, `${militante.nombres} ${militante.apellidos}`)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t">
                                <div className="text-sm text-muted-foreground">
                                    Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalCount)} de {totalCount} militantes
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1 || militantesLoading}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-center px-3 text-sm">
                                        Página {currentPage} de {totalPages}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages || militantesLoading}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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
    </>
  )
}

