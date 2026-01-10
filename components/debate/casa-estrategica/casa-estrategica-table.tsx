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
import { CasaEstrategicaForm } from './casa-estrategica-form'
import { deleteCasaEstrategica, type CasaEstrategica } from '@/lib/actions/debate'
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

interface CasaEstrategicaTableProps {
    casas: CasaEstrategica[]
}

export function CasaEstrategicaTable({ casas }: CasaEstrategicaTableProps) {
    const handleDelete = async (id: string) => {
        try {
            await deleteCasaEstrategica(id)
            toast.success('Casa estratégica eliminada correctamente')
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar la casa estratégica')
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha Inst.</TableHead>
                        <TableHead>Coordinador</TableHead>
                        <TableHead>Militante</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Ciudad/Barrio</TableHead>
                        <TableHead>Publicidad</TableHead>
                        <TableHead>Medidas</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {casas.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                No hay casas estratégicas registradas.
                            </TableCell>
                        </TableRow>
                    ) : (
                        casas.map((casa) => (
                            <TableRow key={casa.id}>
                                <TableCell>{casa.fecha_instalacion}</TableCell>
                                <TableCell>
                                    {casa.coordinador?.usuario?.nombres} {casa.coordinador?.usuario?.apellidos}
                                </TableCell>
                                <TableCell>
                                    {casa.militante?.usuario?.nombres} {casa.militante?.usuario?.apellidos}
                                </TableCell>
                                <TableCell>{casa.direccion}</TableCell>
                                <TableCell>
                                    {casa.ciudad?.nombre} - {casa.barrio?.nombre}
                                </TableCell>
                                <TableCell>{casa.tipo_publicidad}</TableCell>
                                <TableCell>{casa.medidas}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <CasaEstrategicaForm
                                        casa={casa}
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
                                                <AlertDialogAction onClick={() => handleDelete(casa.id)}>
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
