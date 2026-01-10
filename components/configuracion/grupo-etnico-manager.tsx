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
import { createGrupoEtnico, updateGrupoEtnico, deleteGrupoEtnico, type GrupoEtnico } from '@/lib/actions/configuracion'
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

interface GrupoEtnicoManagerProps {
    initialGrupos: GrupoEtnico[]
}

export function GrupoEtnicoManager({ initialGrupos }: GrupoEtnicoManagerProps) {
    const [grupos, setGrupos] = useState<GrupoEtnico[]>(initialGrupos)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingGrupo, setEditingGrupo] = useState<GrupoEtnico | null>(null)
    const { toast } = useToast()

    // Form state
    const [nombre, setNombre] = useState('')

    const resetForm = () => {
        setNombre('')
        setEditingGrupo(null)
    }

    const handleEdit = (grupo: GrupoEtnico) => {
        setEditingGrupo(grupo)
        setNombre(grupo.nombre?.toUpperCase() || '')
        setIsDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append('nombre', nombre.toUpperCase())

        try {
            if (editingGrupo) {
                await updateGrupoEtnico(editingGrupo.id, formData)
                toast({ title: 'Grupo étnico actualizado correctamente' })
            } else {
                await createGrupoEtnico(formData)
                toast({ title: 'Grupo étnico creado correctamente' })
            }
            setIsDialogOpen(false)
            resetForm()
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Ocurrió un error',
                variant: 'destructive'
            })
        }
    }

    const handleDelete = async (id: string | number) => {
        try {
            await deleteGrupoEtnico(id)
            toast({ title: 'Grupo étnico eliminado correctamente' })
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Ocurrió un error',
                variant: 'destructive'
            })
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Grupos Étnicos</h3>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Grupo
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingGrupo ? 'Editar Grupo' : 'Nuevo Grupo'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nombre">Nombre</Label>
                                <Input
                                    id="nombre"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value.toUpperCase())}
                                    style={{ textTransform: 'uppercase' }}
                                    required
                                />
                            </div>

                            <div className="flex justify-end space-x-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit">
                                    {editingGrupo ? 'Actualizar' : 'Crear'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialGrupos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                                    No hay grupos étnicos registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialGrupos.map((grupo) => (
                                <TableRow key={String(grupo.id)}>
                                    <TableCell className="font-medium uppercase">{grupo.nombre || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(grupo)}>
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
                                                            Esta acción no se puede deshacer. Eliminará el grupo étnico.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(grupo.id)}>
                                                            Eliminar
                                                        </AlertDialogAction>
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
