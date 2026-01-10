"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { SolicitudGestion } from "@/lib/actions/gestion"

interface SolicitudesTableProps {
    value?: SolicitudGestion[]
    onChange: (value: SolicitudGestion[]) => void
}

export function SolicitudesTable({ value = [], onChange }: SolicitudesTableProps) {
    const [rows, setRows] = useState<SolicitudGestion[]>(value)

    useEffect(() => {
        setRows(value)
    }, [value])

    const addRow = () => {
        const newRow: SolicitudGestion = {
            elemento: "",
            unidad: "",
            categoria: "",
            sector: "",
            cantidad: 0,
            orden: rows.length + 1,
        }
        const newRows = [...rows, newRow]
        setRows(newRows)
        onChange(newRows)
    }

    const removeRow = (index: number) => {
        const newRows = rows.filter((_, i) => i !== index)
        // Re-index order
        const reorderedRows = newRows.map((row, i) => ({ ...row, orden: i + 1 }))
        setRows(reorderedRows)
        onChange(reorderedRows)
    }

    const updateRow = (index: number, field: keyof SolicitudGestion, val: any) => {
        const newRows = [...rows]
        newRows[index] = { ...newRows[index], [field]: val }
        setRows(newRows)
        onChange(newRows)
    }

    // Ensure at least 5 rows initially if empty (as per requirements)
    useEffect(() => {
        if (rows.length === 0) {
            const initialRows = Array(5).fill(null).map((_, i) => ({
                elemento: "",
                unidad: "",
                categoria: "",
                sector: "",
                cantidad: 0,
                orden: i + 1,
            }))
            setRows(initialRows)
            onChange(initialRows)
        }
    }, [])

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">SOLICITUDES DE GESTIÓN</h3>
                <Button type="button" onClick={addRow} size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Agregar Fila
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Elemento</TableHead>
                            <TableHead>Unidad</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Sector</TableHead>
                            <TableHead className="w-[100px]">Cantidad</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Select
                                        value={row.elemento}
                                        onValueChange={(val) => updateRow(index, "elemento", val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Cemento">Cemento</SelectItem>
                                            <SelectItem value="Ladrillo">Ladrillo</SelectItem>
                                            <SelectItem value="Arena">Arena</SelectItem>
                                            <SelectItem value="Tejas">Tejas</SelectItem>
                                            <SelectItem value="Pintura">Pintura</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={row.unidad}
                                        onValueChange={(val) => updateRow(index, "unidad", val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Bulto">Bulto</SelectItem>
                                            <SelectItem value="Metro">Metro</SelectItem>
                                            <SelectItem value="Galón">Galón</SelectItem>
                                            <SelectItem value="Unidad">Unidad</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={row.categoria}
                                        onValueChange={(val) => updateRow(index, "categoria", val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Construcción">Construcción</SelectItem>
                                            <SelectItem value="Acabados">Acabados</SelectItem>
                                            <SelectItem value="Infraestructura">Infraestructura</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={row.sector}
                                        onValueChange={(val) => updateRow(index, "sector", val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Vivienda">Vivienda</SelectItem>
                                            <SelectItem value="Vía Pública">Vía Pública</SelectItem>
                                            <SelectItem value="Parque">Parque</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        value={row.cantidad}
                                        onChange={(e) => updateRow(index, "cantidad", Number(e.target.value))}
                                        min={0}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeRow(index)}
                                        className="text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
