'use client'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Download, ChevronDown } from 'lucide-react'

// Botón "Exportar" con los 9 reportes de Excel equivalentes a los de Zeus.
// Cada uno pega directo a su ruta /api/informes/export/[tipo], que arma y
// descarga el .xlsx (mismo patrón que /api/personas/exportar).
const EXPORTS = [
    { label: 'Consolidado Electoral', href: '/api/informes/export/consolidado-electoral' },
    { label: 'Lista de verificación del Coordinador', href: '/api/informes/export/checklist' },
    { label: 'Exportar Visitas', href: '/api/informes/export/visitas' },
    { label: 'Exportar Personas', href: '/api/personas/exportar' },
    { label: 'Casa Estratégica', href: '/api/informes/export/casa-estrategica' },
    { label: 'Vehículo amigo', href: '/api/informes/export/vehiculo-amigo' },
    { label: 'Marketing de vehículos', href: '/api/informes/export/marketing-vehiculos' },
    { label: 'Planillas', href: '/api/informes/export/planillas' },
    { label: 'Planillas Consolidado', href: '/api/informes/export/planillas-consolidado' },
]

export function ExportarInformes() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Descargar Excel</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {EXPORTS.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                        <a href={item.href}>{item.label}</a>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
