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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { createCiudad, updateCiudad, deleteCiudad, type Ciudad } from '@/lib/actions/configuracion'
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

interface CiudadesManagerProps {
    initialCiudades: Ciudad[]
}

export function CiudadesManager({ initialCiudades }: CiudadesManagerProps) {
    const [ciudades, setCiudades] = useState<Ciudad[]>(initialCiudades)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCiudad, setEditingCiudad] = useState<Ciudad | null>(null)
    const { toast } = useToast()

    // Form state
    const [nombre, setNombre] = useState('')
    const [codigo, setCodigo] = useState('')
    const [activo, setActivo] = useState(true)

    const resetForm = () => {
        setNombre('')
        setCodigo('')
        setActivo(true)
        setEditingCiudad(null)
    }

    const handleEdit = (ciudad: Ciudad) => {
        setEditingCiudad(ciudad)
        setNombre(ciudad.nombre.toUpperCase())
        setCodigo(ciudad.codigo?.toUpperCase() || '')
        setActivo(ciudad.activo)
        setIsDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append('nombre', nombre.toUpperCase())
        formData.append('codigo', codigo.toUpperCase())
        formData.append('activo', String(activo))

        try {
            if (editingCiudad) {
                await updateCiudad(editingCiudad.id, formData)
                toast({ title: 'Ciudad actualizada correctamente' })
            } else {
                await createCiudad(formData)
                toast({ title: 'Ciudad creada correctamente' })
            }
            setIsDialogOpen(false)
            resetForm()
            // In a real app with server actions and revalidatePath, the page refreshes.
            // But for immediate feedback if not refreshing, we might need to update local state or rely on router refresh.
            // Since we are in a client component receiving props, we rely on the parent to refresh or router.refresh()
            // For simplicity, we'll assume revalidatePath works and triggers a refresh.
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
            await deleteCiudad(id)
            toast({ title: 'Ciudad eliminada correctamente' })
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
                <h3 className="text-lg font-medium">Listado de Ciudades</h3>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Ciudad
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingCiudad ? 'Editar Ciudad' : 'Nueva Ciudad'}</DialogTitle>
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
                            <div className="space-y-2">
                                <Label htmlFor="codigo">Código (Opcional)</Label>
                                <Input
                                    id="codigo"
                                    value={codigo}
                                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                                    style={{ textTransform: 'uppercase' }}
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="activo"
                                    checked={activo}
                                    onCheckedChange={setActivo}
                                />
                                <Label htmlFor="activo">Activo</Label>
                            </div>
                            <div className="flex justify-end space-x-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit">
                                    {editingCiudad ? 'Actualizar' : 'Crear'}
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
                            <TableHead>Código</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialCiudades.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                    No hay ciudades registradas.
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialCiudades.map((ciudad) => (
                                <TableRow key={ciudad.id}>
                                    <TableCell className="font-medium uppercase">{ciudad.nombre}</TableCell>
                                    <TableCell className="uppercase">{ciudad.codigo || '-'}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs ${ciudad.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {ciudad.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(ciudad)}>
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
                                                            Esta acción no se puede deshacer. Eliminará la ciudad y podría afectar a los registros asociados.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(ciudad.id)}>
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
