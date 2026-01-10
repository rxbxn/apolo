'use client'

import { useState, useMemo } from 'react'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Pencil, Trash2, Plus, Filter } from 'lucide-react'
import { createBarrio, updateBarrio, deleteBarrio, type Barrio, type Ciudad } from '@/lib/actions/configuracion'
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

interface BarriosManagerProps {
    initialBarrios: Barrio[]
    ciudades: Ciudad[]
}

export function BarriosManager({ initialBarrios, ciudades }: BarriosManagerProps) {
    const [barrios, setBarrios] = useState<Barrio[]>(initialBarrios)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingBarrio, setEditingBarrio] = useState<Barrio | null>(null)
    const { toast } = useToast()

    // Filter state
    const [selectedCiudadFilter, setSelectedCiudadFilter] = useState<string>('all')

    // Form state
    const [nombre, setNombre] = useState('')
    const [ciudadId, setCiudadId] = useState('')
    const [codigo, setCodigo] = useState('')
    const [activo, setActivo] = useState(true)

    const resetForm = () => {
        setNombre('')
        setCiudadId('')
        setCodigo('')
        setActivo(true)
        setEditingBarrio(null)
    }

    const handleEdit = (barrio: Barrio) => {
        setEditingBarrio(barrio)
        setNombre(barrio.nombre.toUpperCase())
        setCiudadId(barrio.ciudad_id)
        setCodigo(barrio.codigo?.toUpperCase() || '')
        setActivo(barrio.activo)
        setIsDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append('nombre', nombre.toUpperCase())
        formData.append('ciudad_id', ciudadId)
        formData.append('codigo', codigo.toUpperCase())
        formData.append('activo', String(activo))

        try {
            if (editingBarrio) {
                await updateBarrio(editingBarrio.id, formData)
                toast({ title: 'Barrio actualizado correctamente' })
            } else {
                await createBarrio(formData)
                toast({ title: 'Barrio creado correctamente' })
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

    const handleDelete = async (id: string) => {
        try {
            await deleteBarrio(id)
            toast({ title: 'Barrio eliminado correctamente' })
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Ocurrió un error',
                variant: 'destructive'
            })
        }
    }

    const filteredBarrios = useMemo(() => {
        if (selectedCiudadFilter === 'all') return initialBarrios
        return initialBarrios.filter(b => b.ciudad_id === selectedCiudadFilter)
    }, [initialBarrios, selectedCiudadFilter])

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-medium">Listado de Barrios</h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={selectedCiudadFilter} onValueChange={setSelectedCiudadFilter}>
                        <SelectTrigger className="w-[200px]">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Filtrar por ciudad" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las ciudades</SelectItem>
                            {ciudades.map(ciudad => (
                                <SelectItem key={ciudad.id} value={ciudad.id}>{ciudad.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open)
                        if (!open) resetForm()
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={resetForm}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Barrio
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingBarrio ? 'Editar Barrio' : 'Nuevo Barrio'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ciudad">Ciudad</Label>
                                    <Select value={ciudadId} onValueChange={setCiudadId} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar ciudad" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ciudades.filter(c => c.activo).map(ciudad => (
                                                <SelectItem key={ciudad.id} value={ciudad.id}>{ciudad.nombre}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                        {editingBarrio ? 'Actualizar' : 'Crear'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Ciudad</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredBarrios.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    No hay barrios registrados {selectedCiudadFilter !== 'all' && 'para esta ciudad'}.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredBarrios.map((barrio) => (
                                <TableRow key={barrio.id}>
                                    <TableCell className="font-medium uppercase">{barrio.nombre}</TableCell>
                                    <TableCell className="uppercase">{barrio.ciudad?.nombre || '-'}</TableCell>
                                    <TableCell className="uppercase">{barrio.codigo || '-'}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs ${barrio.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {barrio.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(barrio)}>
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
                                                            Esta acción no se puede deshacer. Eliminará el barrio.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(barrio.id)}>
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
