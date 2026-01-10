'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { PlanillasForm } from './planillas-form'
import { deletePlanilla, type Planilla } from '@/lib/actions/debate'
import { Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface PlanillasTableProps {
    planillas: Planilla[]
}

export function PlanillasTable({ planillas }: PlanillasTableProps) {
    const handleDelete = async (id: string) => {
        try {
            await deletePlanilla(id)
            toast.success('Planilla eliminada correctamente')
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar la planilla')
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Planilla</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Coordinador</TableHead>
                        <TableHead>Militante</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Radicado</TableHead>
                        <TableHead className="text-right">Cautivo</TableHead>
                        <TableHead className="text-right">Marketing</TableHead>
                        <TableHead className="text-right">Impacto</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {planillas.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                                No hay planillas registradas.
                            </TableCell>
                        </TableRow>
                    ) : (
                        planillas.map((planilla, index) => (
                            <TableRow key={planilla.id}>
                                <TableCell className="font-medium">
                                    {planillas.length - index}
                                </TableCell>
                                <TableCell>{planilla.fecha_planilla}</TableCell>
                                <TableCell>
                                    {planilla.coordinador?.usuario?.nombres} {planilla.coordinador?.usuario?.apellidos}
                                </TableCell>
                                <TableCell>
                                    {planilla.militante?.usuario?.nombres} {planilla.militante?.usuario?.apellidos}
                                </TableCell>
                                <TableCell>
                                    {planilla.militante?.tipo}
                                </TableCell>
                                <TableCell className="text-right">{planilla.radicado}</TableCell>
                                <TableCell className="text-right">{planilla.cautivo}</TableCell>
                                <TableCell className="text-right">{planilla.marketing}</TableCell>
                                <TableCell className="text-right">{planilla.impacto}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <PlanillasForm
                                        planilla={planilla}
                                        trigger={
                                            <Button variant="ghost" size="icon">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        }
                                    />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(planilla.id)}>
                                                    Eliminar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
