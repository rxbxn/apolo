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
import { InconsistenciasForm } from './inconsistencias-form'
import { deleteInconsistencia, type Inconsistencia } from '@/lib/actions/debate'
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

interface InconsistenciasTableProps {
    inconsistencias: Inconsistencia[]
}

export function InconsistenciasTable({ inconsistencias }: InconsistenciasTableProps) {
    const handleDelete = async (id: string) => {
        try {
            await deleteInconsistencia(id)
            toast.success('Inconsistencia eliminada correctamente')
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar la inconsistencia')
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Coordinador</TableHead>
                        <TableHead>Militante</TableHead>
                        <TableHead className="text-right">Radical</TableHead>
                        <TableHead className="text-right">Exclusión</TableHead>
                        <TableHead className="text-right">Fuera B/Q</TableHead>
                        <TableHead className="text-right">Resueltos</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {inconsistencias.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                No hay inconsistencias registradas.
                            </TableCell>
                        </TableRow>
                    ) : (
                        inconsistencias.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.fecha_inconsistencia}</TableCell>
                                <TableCell>
                                    {item.coordinador?.usuario?.nombres} {item.coordinador?.usuario?.apellidos}
                                </TableCell>
                                <TableCell>
                                    {item.militante?.usuario?.nombres} {item.militante?.usuario?.apellidos}
                                </TableCell>
                                <TableCell className="text-right">{item.radical}</TableCell>
                                <TableCell className="text-right">{item.exclusion}</TableCell>
                                <TableCell className="text-right">{item.fuera_barranquilla}</TableCell>
                                <TableCell className="text-right">{item.cantidad_resuelto}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <InconsistenciasForm
                                        inconsistencia={item}
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
                                                <AlertDialogAction onClick={() => handleDelete(item.id)}>
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
        </div >
    )
}
