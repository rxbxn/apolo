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
import { VehiculoAmigoForm } from './vehiculo-amigo-form'
import { deleteVehiculoAmigo, type VehiculoAmigo } from '@/lib/actions/debate'
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

interface VehiculoAmigoTableProps {
    vehiculos: VehiculoAmigo[]
}

export function VehiculoAmigoTable({ vehiculos }: VehiculoAmigoTableProps) {
    const handleDelete = async (id: string) => {
        try {
            await deleteVehiculoAmigo(id)
            toast.success('Vehículo eliminado correctamente')
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar el vehículo')
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha Reg.</TableHead>
                        <TableHead>Coordinador</TableHead>
                        <TableHead>Propietario</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Observaciones</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {vehiculos.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                No hay vehículos registrados.
                            </TableCell>
                        </TableRow>
                    ) : (
                        vehiculos.map((vehiculo) => (
                            <TableRow key={vehiculo.id}>
                                <TableCell>{vehiculo.fecha_registro}</TableCell>
                                <TableCell>
                                    {vehiculo.coordinador?.usuario?.nombres} {vehiculo.coordinador?.usuario?.apellidos}
                                </TableCell>
                                <TableCell>{vehiculo.propietario}</TableCell>
                                <TableCell>{vehiculo.placa}</TableCell>
                                <TableCell>{vehiculo.tipo_vehiculo}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={vehiculo.observaciones}>
                                    {vehiculo.observaciones}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <VehiculoAmigoForm
                                        vehiculo={vehiculo}
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
                                                <AlertDialogAction onClick={() => handleDelete(vehiculo.id)}>
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
