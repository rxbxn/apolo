'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ActivityForm } from './activity-form'
import { deleteActivity, type Activity } from '@/lib/actions/activities'
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

interface ActivityTableProps {
    activities: Activity[]
}

export function ActivityTable({ activities }: ActivityTableProps) {
    const handleDelete = async (id: string) => {
        try {
            await deleteActivity(id)
            toast.success('Actividad eliminada correctamente')
        } catch (error) {
            toast.error('Error al eliminar la actividad')
            console.error(error)
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Actividad</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {activities.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                No hay actividades registradas.
                            </TableCell>
                        </TableRow>
                    ) : (
                        activities.map((activity) => (
                            <TableRow key={activity.id}>
                                <TableCell className="font-medium">{activity.nombre}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={activity.estado === 'vigente' ? 'default' : 'secondary'}
                                        className={
                                            activity.estado === 'vigente'
                                                ? 'bg-green-500 hover:bg-green-600'
                                                : 'bg-gray-500 hover:bg-gray-600'
                                        }
                                    >
                                        {activity.estado === 'vigente' ? 'Vigente' : 'No Vigente'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <ActivityForm
                                        activity={activity}
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
                                                    Esta acción no se puede deshacer. Esto eliminará permanentemente la actividad.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(activity.id)}>
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
