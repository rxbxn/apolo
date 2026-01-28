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
    createCatalogoElemento,
    updateCatalogoElemento,
    deleteCatalogoElemento,
    type CatalogoElemento,
} from '@/lib/actions/configuracion'
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

interface Props {
    initialElementos: CatalogoElemento[]
}

export function ElementosManager({ initialElementos }: Props) {
    const [elementos, setElementos] = useState<CatalogoElemento[]>(initialElementos)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editing, setEditing] = useState<CatalogoElemento | null>(null)

    const { toast } = useToast()

    const [elElemento, setElElemento] = useState('')
    const [elUnidad, setElUnidad] = useState('')
    const [elCategoria, setElCategoria] = useState('')
    const [elSector, setElSector] = useState('')

    const resetForm = () => {
        setElElemento('')
        setElUnidad('')
        setElCategoria('')
        setElSector('')
        setEditing(null)
    }

    const handleEdit = (e: CatalogoElemento) => {
        setEditing(e)
        setElElemento(e.elemento || '')
        setElUnidad(e.unidad || '')
        setElCategoria(e.categoria || '')
        setElSector(e.sector || '')
        setIsDialogOpen(true)
    }

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault()
        const formData = new FormData()
        formData.append('elemento', elElemento)
        formData.append('unidad', elUnidad)
        formData.append('categoria', elCategoria)
        formData.append('sector', elSector)

        try {
            if (editing) {
                await updateCatalogoElemento(editing.id, formData)
                toast({ title: 'Elemento actualizado correctamente' })
            } else {
                await createCatalogoElemento(formData)
                toast({ title: 'Elemento creado correctamente' })
            }
            setIsDialogOpen(false)
            resetForm()
            // refresh: naive approach - reload page
            window.location.reload()
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Ocurrió un error',
                variant: 'destructive'
            })
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteCatalogoElemento(id)
            toast({ title: 'Elemento eliminado correctamente' })
            window.location.reload()
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Ocurrió un error',
                variant: 'destructive'
            })
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Elementos Gestión</h3>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm() }}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Elemento
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editing ? 'Editar Elemento' : 'Nuevo Elemento'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="elemento">Elemento</Label>
                                <Input id="elemento" value={elElemento} onChange={(e) => setElElemento(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="unidad">Unidad</Label>
                                <Input id="unidad" value={elUnidad} onChange={(e) => setElUnidad(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="categoria">Categoría</Label>
                                <Input id="categoria" value={elCategoria} onChange={(e) => setElCategoria(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sector">Sector</Label>
                                <Input id="sector" value={elSector} onChange={(e) => setElSector(e.target.value)} />
                            </div>

                            <div className="flex justify-end space-x-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit">{editing ? 'Actualizar' : 'Crear'}</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Elemento</TableHead>
                            <TableHead>Unidad</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Sector</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialElementos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No hay elementos registrados.</TableCell>
                            </TableRow>
                        ) : (
                            initialElementos.map(el => (
                                <TableRow key={el.id}>
                                    <TableCell className="font-medium uppercase">{el.elemento || '-'}</TableCell>
                                    <TableCell>{el.unidad || '-'}</TableCell>
                                    <TableCell>{el.categoria || '-'}</TableCell>
                                    <TableCell>{el.sector || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(el as any)}>
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
                                                            Esta acción no se puede deshacer. Eliminará el elemento.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(el.id)}>Eliminar</AlertDialogAction>
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
