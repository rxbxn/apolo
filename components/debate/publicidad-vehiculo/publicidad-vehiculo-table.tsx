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
import { PublicidadVehiculoForm } from './publicidad-vehiculo-form'
import { deletePublicidadVehiculo, type PublicidadVehiculo } from '@/lib/actions/debate'
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

interface PublicidadVehiculoTableProps {
    publicidad: PublicidadVehiculo[]
}

export function PublicidadVehiculoTable({ publicidad }: PublicidadVehiculoTableProps) {
    const handleDelete = async (id: string) => {
        try {
            await deletePublicidadVehiculo(id)
            toast.success('Publicidad eliminada correctamente')
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar la publicidad')
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha Inst.</TableHead>
                        <TableHead>Coordinador</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Medidas</TableHead>
                        <TableHead>Ciudad/Barrio</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {publicidad.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                No hay publicidad registrada.
                            </TableCell>
                        </TableRow>
                    ) : (
                        publicidad.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.fecha_instalacion}</TableCell>
                                <TableCell>
                                    {item.coordinador?.usuario?.nombres} {item.coordinador?.usuario?.apellidos}
                                </TableCell>
                                <TableCell>{item.tipo_publicidad}</TableCell>
                                <TableCell>{item.medidas}</TableCell>
                                <TableCell>
                                    {item.ciudad?.nombre} - {item.barrio?.nombre}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <PublicidadVehiculoForm
                                        publicidad={item}
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
