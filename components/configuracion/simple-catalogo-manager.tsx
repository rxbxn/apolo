'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Pencil, Trash2, Plus } from 'lucide-react'
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
import type { CatalogoSimple } from '@/lib/actions/configuracion'

interface Props {
    titulo: string
    descripcion?: string
    campoLabel?: string
    initialItems: CatalogoSimple[]
    createAction: (formData: FormData) => Promise<void>
    updateAction: (id: string, formData: FormData) => Promise<void>
    deleteAction: (id: string) => Promise<void>
}

// Manager genérico de CRUD para catálogos de un solo campo ("nombre").
// Se reutiliza para Elemento/Unidad/Categoría/Sector de Gestión Gerencial
// en vez de duplicar el mismo componente 4 veces.
export function SimpleCatalogoManager({
    titulo,
    descripcion,
    campoLabel = 'Nombre',
    initialItems,
    createAction,
    updateAction,
    deleteAction,
}: Props) {
    const [items, setItems] = useState<CatalogoSimple[]>(initialItems)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editing, setEditing] = useState<CatalogoSimple | null>(null)
    const [nombre, setNombre] = useState('')
    const [saving, setSaving] = useState(false)

    const { toast } = useToast()

    const resetForm = () => {
        setNombre('')
        setEditing(null)
    }

    const handleEdit = (item: CatalogoSimple) => {
        setEditing(item)
        setNombre(item.nombre || '')
        setIsDialogOpen(true)
    }

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault()
        const formData = new FormData()
        formData.append('nombre', nombre)
        setSaving(true)
        try {
            if (editing) {
                await updateAction(editing.id, formData)
                toast({ title: `${titulo}: actualizado correctamente` })
            } else {
                await createAction(formData)
                toast({ title: `${titulo}: creado correctamente` })
            }
            setIsDialogOpen(false)
            resetForm()
            window.location.reload()
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Ocurrió un error',
                variant: 'destructive',
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteAction(id)
            toast({ title: `${titulo}: eliminado correctamente` })
            window.location.reload()
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Ocurrió un error',
                variant: 'destructive',
            })
        }
    }

    return (
        <div>
            <div className="flex justify-between items-start mb-3 gap-2">
                <div>
                    <h3 className="text-base font-medium">{titulo}</h3>
                    {descripcion && (
                        <p className="text-sm text-muted-foreground">{descripcion}</p>
                    )}
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
                    <DialogTrigger asChild>
                        <Button size="sm" onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editing ? `Editar ${titulo}` : `Nuevo ${titulo}`}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre">{campoLabel}</Label>
                                <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={saving}>{editing ? 'Actualizar' : 'Crear'}</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border max-h-72 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{campoLabel}</TableHead>
                            <TableHead className="text-right w-24">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center h-20 text-muted-foreground text-sm">
                                    Sin registros.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.nombre}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
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
                                                            Esta acción no se puede deshacer. Eliminará &quot;{item.nombre}&quot;.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(item.id)}>Eliminar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
