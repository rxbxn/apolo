"use client"

import { useState, useEffect } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Search,
    RefreshCw,
    ArrowRightLeft,
    Loader2,
    UserCheck,
    AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import { getPersonas, transferToUsuarios, type Persona } from "@/lib/actions/persona"
import { Badge } from "@/components/ui/badge"

export function PersonaTable() {
    const [personas, setPersonas] = useState<Persona[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [isTransferring, setIsTransferring] = useState(false)
    const [showAllFields, setShowAllFields] = useState(false)
    const [dynamicFields, setDynamicFields] = useState<string[]>([])
    const [uploadSummary, setUploadSummary] = useState<{ filename?: string, total?: number, errors?: any[] } | null>(null)
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(25)

    const fetchPersonas = async () => {
        setLoading(true)
        try {
            const data = await getPersonas()
            setPersonas(data)
        } catch (error) {
            toast.error("Error al cargar los datos")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPersonas()
    }, [])

    useEffect(() => {
        const handler = (e: any) => {
            const detail = e.detail || {}
            setUploadSummary(detail)
            // Refrescar lista
            fetchPersonas()
        }

        window.addEventListener('persona:upload:complete', handler)
        return () => window.removeEventListener('persona:upload:complete', handler)
    }, [])

    const filteredPersonas = personas.filter(p =>
        p.persona?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula?.includes(searchTerm) ||
        p.celular?.includes(searchTerm)
    )

    const totalPages = Math.max(1, Math.ceil(filteredPersonas.length / perPage))
    // Ensure current page is in range
    if (page > totalPages) setPage(totalPages)

    const paginatedPersonas = filteredPersonas.slice((page - 1) * perPage, page * perPage)

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleSelectAll = () => {
        const pageIds = paginatedPersonas.map(p => p.id!).filter(Boolean)
        const allSelectedOnPage = pageIds.every(id => selectedIds.includes(id)) && pageIds.length > 0
        if (allSelectedOnPage) {
            // remove page ids from selection
            setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)))
        } else {
            // add page ids to selection (avoid duplicates)
            setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])))
        }
    }

    const handleTransfer = async () => {
        if (selectedIds.length === 0) {
            toast.error("Selecciona al menos un registro para transferir")
            return
        }

        setIsTransferring(true)
        try {
            const result = await transferToUsuarios(selectedIds)
            toast.success(`Se han sincronizado ${result.count} registros con Usuarios`)
            setSelectedIds([])
            // Podríamos refrescar si el estado de sincronización se guardara en persona
        } catch (error) {
            toast.error("Error durante la transferencia")
        } finally {
            setIsTransferring(false)
        }
    }

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">Registros de Personas</CardTitle>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            // calcular campos dinámicos
                            if (personas.length > 0) {
                                const keys = Array.from(new Set(personas.flatMap(p => Object.keys(p))))
                                setDynamicFields(keys)
                                setShowAllFields(prev => !prev)
                            } else {
                                toast.info('No hay registros para mostrar todos los campos')
                            }
                        }}
                    >
                        {showAllFields ? 'Ocultar campos' : 'Mostrar todos los campos'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchPersonas}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refrescar
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={handleTransfer}
                        disabled={selectedIds.length === 0 || isTransferring}
                    >
                        {isTransferring ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                        )}
                        Sincronizar con Usuarios ({selectedIds.length})
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, cédula o celular..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={paginatedPersonas.length > 0 && paginatedPersonas.every(p => selectedIds.includes(p.id!))}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>Persona</TableHead>
                                <TableHead>Cédula</TableHead>
                                <TableHead>Celular</TableHead>
                                <TableHead>Ciudad/Barrio</TableHead>
                                <TableHead>Estado</TableHead>
                                {showAllFields && dynamicFields.map((f) => (
                                    <TableHead key={f}>{f}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6 + (showAllFields ? dynamicFields.length : 0)} className="h-24 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Cargando datos...
                                    </TableCell>
                                </TableRow>
                            ) : filteredPersonas.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6 + (showAllFields ? dynamicFields.length : 0)} className="h-24 text-center text-muted-foreground">
                                        No se encontraron registros.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedPersonas.map((persona) => (
                                    <TableRow key={persona.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(persona.id!)}
                                                onCheckedChange={() => toggleSelect(persona.id!)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {persona.persona}
                                        </TableCell>
                                        <TableCell>{persona.cedula}</TableCell>
                                        <TableCell>{persona.celular}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs">
                                                <span>{persona.ciudad}</span>
                                                <span className="text-muted-foreground">{persona.barrio}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={persona.estado === 'activo' ? 'default' : 'secondary'} className="capitalize">
                                                {persona.estado || 'activo'}
                                            </Badge>
                                        </TableCell>
                                        {showAllFields && dynamicFields.map((f) => (
                                            <TableCell key={f} className="text-xs">
                                                {((persona as any)[f] !== undefined && (persona as any)[f] !== null) ? String((persona as any)[f]) : '-'}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination controls */}
                <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Mostrando {(filteredPersonas.length === 0) ? 0 : (page - 1) * perPage + 1} - {Math.min(page * perPage, filteredPersonas.length)} de {filteredPersonas.length}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={page === 1}>Anterior</Button>
                            <Button size="sm" variant="outline" onClick={() => setPage(prev => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>Siguiente</Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm">Filas por página:</label>
                            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1 text-sm">
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </div>

                {uploadSummary && (
                    <div className="mt-4 p-3 border rounded bg-muted/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <strong>Archivo:</strong> {uploadSummary.filename || 'N/A'}
                                <br />
                                <strong>Total importados:</strong> {uploadSummary.total ?? 'N/A'}
                            </div>
                            <div>
                                {uploadSummary.errors && uploadSummary.errors.length > 0 ? (
                                    <Badge variant="destructive">Errores: {uploadSummary.errors.length}</Badge>
                                ) : (
                                    <Badge variant="default">Sin errores</Badge>
                                )}
                            </div>
                        </div>

                        {uploadSummary.errors && uploadSummary.errors.length > 0 && (
                            <div className="mt-3 text-xs">
                                <details>
                                    <summary className="cursor-pointer">Ver errores</summary>
                                    <ul className="mt-2 list-disc ml-5">
                                        {uploadSummary.errors.map((err: any, idx: number) => (
                                            <li key={idx}><strong>Fila {err.row}:</strong> {err.error}</li>
                                        ))}
                                    </ul>
                                </details>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
