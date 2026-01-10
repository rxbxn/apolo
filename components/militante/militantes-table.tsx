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
import { Search, Edit, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { useMilitantes } from "@/lib/hooks/use-militantes"
import { usePermisos } from "@/lib/hooks/use-permisos"
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
    const { listar, eliminar, loading } = useMilitantes()
    const { permisos } = usePermisos("Módulo Militante")

    const [militantes, setMilitantes] = useState<any[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Filtros
    const [search, setSearch] = useState("")
    const [estadoFilter, setEstadoFilter] = useState<string>("todos")

    const pageSize = 10

    useEffect(() => {
        cargarMilitantes()
    }, [currentPage, search, estadoFilter])

    async function cargarMilitantes() {
        try {
            const filtros: any = {}

            if (search) filtros.busqueda = search
            if (estadoFilter !== "todos") filtros.estado = estadoFilter

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
        if (!confirm(`¿Estás seguro de eliminar a ${nombre}?`)) return

        try {
            await eliminar(id)
            toast.success("Militante eliminado exitosamente")
            cargarMilitantes()
        } catch (error) {
            console.error("Error eliminando militante:", error)
            toast.error("Error al eliminar militante")
        }
    }

    return (
        <Card>
            <CardContent className="p-6">
                <div className="space-y-4">
                    {/* Filtros */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
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
                        </div>
                        <Select value={estadoFilter} onValueChange={(value) => {
                            setEstadoFilter(value)
                            setCurrentPage(1)
                        }}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue placeholder="Filtrar por estado" />
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
                                    {loading ? (
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
                                        disabled={currentPage === 1 || loading}
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
                                        disabled={currentPage === totalPages || loading}
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
    )
}

