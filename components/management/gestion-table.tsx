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
import { Search, Edit, Calendar, User, Users, Eye, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { getGestiones } from "@/lib/actions/gestion"

const getPrioridadColor = (prioridad: string) => {
    const colors: Record<string, string> = {
        alta: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
        media: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
        baja: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    }
    return colors[prioridad] || colors.media
}

export function GestionTable() {
    const router = useRouter()
    
    const [gestiones, setGestiones] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Filtros
    const [search, setSearch] = useState("")
    const [prioridadFilter, setPrioridadFilter] = useState<string>("todos")

    const pageSize = 10

    useEffect(() => {
        cargarGestiones()
    }, [currentPage, search, prioridadFilter])

    async function cargarGestiones() {
        try {
            setLoading(true)
            console.log("🔄 Cargando gestiones...")
            const data = await getGestiones()
            
            console.log("✅ Datos recibidos:", data)
            console.log("📋 Cantidad:", data?.length || 0)
            
            if (data && data.length > 0) {
                console.log("📄 Primer registro completo:", data[0])
                console.log("🔑 ID del primer registro:", data[0].id)
                console.log("🔍 Tipo de ID:", typeof data[0].id)
                console.log("📝 Campos disponibles:", Object.keys(data[0]))
            }
            
            // Filtros locales
            let filteredData = data
            
            if (search) {
                filteredData = filteredData.filter((gestion: any) => 
                    gestion.numero_formulario?.toLowerCase().includes(search.toLowerCase()) ||
                    gestion.militante_nombre?.toLowerCase().includes(search.toLowerCase()) ||
                    gestion.gestor_asignado?.toLowerCase().includes(search.toLowerCase())
                )
            }
            
            if (prioridadFilter !== "todos") {
                filteredData = filteredData.filter((gestion: any) => 
                    gestion.prioridad === prioridadFilter
                )
            }

            // Paginación local
            setTotalCount(filteredData.length)
            setTotalPages(Math.ceil(filteredData.length / pageSize))
            
            const startIndex = (currentPage - 1) * pageSize
            const endIndex = startIndex + pageSize
            setGestiones(filteredData.slice(startIndex, endIndex))
            
        } catch (error) {
            console.error("Error cargando gestiones:", error)
            toast.error("Error al cargar gestiones")
        } finally {
            setLoading(false)
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
                                    placeholder="Buscar por No. Formulario o Nombre..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value)
                                        setCurrentPage(1)
                                    }}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={prioridadFilter} onValueChange={(value) => {
                            setPrioridadFilter(value)
                            setCurrentPage(1)
                        }}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue placeholder="Filtrar por prioridad" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todas las prioridades</SelectItem>
                                <SelectItem value="alta">Alta</SelectItem>
                                <SelectItem value="media">Media</SelectItem>
                                <SelectItem value="baja">Baja</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tabla */}
                    <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                No. <Eye className="h-4 w-4" />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                Fecha <Calendar className="h-4 w-4" />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                Nombre <User className="h-4 w-4" />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                Gestor asignado <Users className="h-4 w-4" />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Prioridad</th>
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
                                    ) : gestiones.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                                No se encontraron formatos de gestión y compromisos.
                                            </td>
                                        </tr>
                                    ) : (
                                        gestiones.map((gestion) => (
                                            <tr key={gestion.id} className="border-t hover:bg-muted/50">
                                                <td className="px-4 py-3 font-medium">
                                                    {gestion.numero_formulario}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {new Date(gestion.fecha_necesidad).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {gestion.militante_nombre || 'Sin asignar'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {gestion.gestor_asignado || 'Sin asignar'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge className={getPrioridadColor(gestion.prioridad)}>
                                                        {gestion.prioridad || 'media'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                console.log("🚀 Navegando a gestión:", gestion.id)
                                                                console.log("🚀 Datos completos:", gestion)
                                                                router.push(`/dashboard/gestion-gerencial/${gestion.id}`)
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
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
                                    Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalCount)} de {totalCount} registros
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