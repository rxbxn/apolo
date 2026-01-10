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

    const filteredPersonas = personas.filter(p =>
        p.persona?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula?.includes(searchTerm) ||
        p.celular?.includes(searchTerm)
    )

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredPersonas.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredPersonas.map(p => p.id!).filter(Boolean))
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
                                        checked={selectedIds.length > 0 && selectedIds.length === filteredPersonas.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>Persona</TableHead>
                                <TableHead>Cédula</TableHead>
                                <TableHead>Celular</TableHead>
                                <TableHead>Ciudad/Barrio</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Cargando datos...
                                    </TableCell>
                                </TableRow>
                            ) : filteredPersonas.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No se encontraron registros.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPersonas.map((persona) => (
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
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
