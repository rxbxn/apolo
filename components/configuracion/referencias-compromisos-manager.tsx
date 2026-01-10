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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Pencil, Trash2, Plus } from 'lucide-react'
import {
    createReferencia,
    updateReferencia,
    deleteReferencia,
    createCompromiso,
    updateCompromiso,
    deleteCompromiso,
    type Referencia,
    type Compromiso,
    type Ciudad,
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
    initialReferencias: Referencia[]
    initialCompromisos: Compromiso[]
    ciudades: Ciudad[]
}

export function ReferenciasCompromisosManager({ initialReferencias, initialCompromisos, ciudades }: Props) {
    const [referencias, setReferencias] = useState<Referencia[]>(initialReferencias)
    const [compromisos, setCompromisos] = useState<Compromiso[]>(initialCompromisos)

    const [isDialogRefOpen, setIsDialogRefOpen] = useState(false)
    const [editingRef, setEditingRef] = useState<Referencia | null>(null)

    const [isDialogCompOpen, setIsDialogCompOpen] = useState(false)
    const [editingComp, setEditingComp] = useState<Compromiso | null>(null)

    const { toast } = useToast()

    // Form state referencias
    const [refNombre, setRefNombre] = useState('')
    const [refTelefono, setRefTelefono] = useState('')
    const [refCiudad, setRefCiudad] = useState('')

    // Form state compromisos
    const [compNombre, setCompNombre] = useState('')

    const resetRefForm = () => {
        setRefNombre('')
        setRefTelefono('')
        setRefCiudad('')
        setEditingRef(null)
    }

    const resetCompForm = () => {
        setCompNombre('')
        setEditingComp(null)
    }

    const handleEditRef = (r: Referencia) => {
        setEditingRef(r)
        setRefNombre(r.nombre?.toUpperCase() || '')
        setRefTelefono(r.telefono || '')
        setRefCiudad(typeof r.ciudad === 'string' ? r.ciudad : (r.ciudad?.id || ''))
        setIsDialogRefOpen(true)
    }

    const handleEditComp = (c: Compromiso) => {
        setEditingComp(c)
        setCompNombre(c.nombre?.toUpperCase() || '')
        setIsDialogCompOpen(true)
    }

    const handleSubmitRef = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append('nombre', refNombre.toUpperCase())
        formData.append('telefono', refTelefono)
        formData.append('ciudad', refCiudad)

        try {
            if (editingRef) {
                await updateReferencia(editingRef.id, formData)
                toast({ title: 'Referencia actualizada correctamente' })
            } else {
                await createReferencia(formData)
                toast({ title: 'Referencia creada correctamente' })
            }
            setIsDialogRefOpen(false)
            resetRefForm()
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Ocurrió un error',
                variant: 'destructive'
            })
        }
    }

    const handleSubmitComp = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append('nombre', compNombre.toUpperCase())

        try {
            if (editingComp) {
                await updateCompromiso(editingComp.id, formData)
                toast({ title: 'Compromiso actualizado correctamente' })
            } else {
                await createCompromiso(formData)
                toast({ title: 'Compromiso creado correctamente' })
            }
            setIsDialogCompOpen(false)
            resetCompForm()
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Ocurrió un error',
                variant: 'destructive'
            })
        }
    }

    const handleDeleteRef = async (id: string) => {
        try {
            await deleteReferencia(id)
            toast({ title: 'Referencia eliminada correctamente' })
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Ocurrió un error',
                variant: 'destructive'
            })
        }
    }

    const handleDeleteComp = async (id: string | number) => {
        try {
            await deleteCompromiso(id)
            toast({ title: 'Compromiso eliminado correctamente' })
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Ocurrió un error',
                variant: 'destructive'
            })
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Referencias</h3>
                    <Dialog open={isDialogRefOpen} onOpenChange={(open) => {
                        setIsDialogRefOpen(open)
                        if (!open) resetRefForm()
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={resetRefForm}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Referencia
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingRef ? 'Editar Referencia' : 'Nueva Referencia'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmitRef} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nombre">Nombre</Label>
                                    <Input 
                                        id="nombre" 
                                        value={refNombre} 
                                        onChange={(e) => setRefNombre(e.target.value.toUpperCase())} 
                                        style={{ textTransform: 'uppercase' }}
                                        required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telefono">Teléfono</Label>
                                    <Input id="telefono" value={refTelefono} onChange={(e) => setRefTelefono(e.target.value)} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="ciudad">Ciudad (Opcional)</Label>
                                    <Select value={refCiudad} onValueChange={setRefCiudad}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar ciudad" />
                                        </SelectTrigger>
                                        <SelectContent>
                                                {/* Radix Select disallows empty string as an Item value.
                                                    Use a sentinel value '__none__' to represent no selection
                                                    and treat it as null on submit. */}
                                                <SelectItem value="__none__">-- Sin ciudad --</SelectItem>
                                                {ciudades.map(ciudad => (
                                                    <SelectItem key={ciudad.id} value={ciudad.id}>{ciudad.nombre}</SelectItem>
                                                ))}
                                            </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex justify-end space-x-2">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogRefOpen(false)}>Cancelar</Button>
                                    <Button type="submit">{editingRef ? 'Actualizar' : 'Crear'}</Button>
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
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Ciudad</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialReferencias.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No hay referencias registradas.</TableCell>
                                </TableRow>
                            ) : (
                                initialReferencias.map(ref => (
                                    <TableRow key={ref.id}>
                                        <TableCell className="font-medium uppercase">{ref.nombre || '-'}</TableCell>
                                        <TableCell>{ref.telefono || '-'}</TableCell>
                                        <TableCell>{ref.ciudad ? (ref as any).ciudad?.nombre || '-' : '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditRef(ref)}>
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
                                                                Esta acción no se puede deshacer. Eliminará la referencia.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteRef(ref.id)}>Eliminar</AlertDialogAction>
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

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Compromisos</h3>
                    <Dialog open={isDialogCompOpen} onOpenChange={(open) => {
                        setIsDialogCompOpen(open)
                        if (!open) resetCompForm()
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={resetCompForm}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Compromiso
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingComp ? 'Editar Compromiso' : 'Nuevo Compromiso'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmitComp} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nombre">Nombre</Label>
                                    <Input 
                                        id="nombre" 
                                        value={compNombre} 
                                        onChange={(e) => setCompNombre(e.target.value.toUpperCase())} 
                                        style={{ textTransform: 'uppercase' }}
                                        required 
                                    />
                                </div>

                                <div className="flex justify-end space-x-2">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogCompOpen(false)}>Cancelar</Button>
                                    <Button type="submit">{editingComp ? 'Actualizar' : 'Crear'}</Button>
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
                            {initialCompromisos.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">No hay compromisos registrados.</TableCell>
                                </TableRow>
                            ) : (
                                initialCompromisos.map(comp => (
                                    <TableRow key={String(comp.id)}>
                                        <TableCell className="font-medium uppercase">{comp.nombre || '-'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditComp(comp)}>
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
                                                                Esta acción no se puede deshacer. Eliminará el compromiso.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteComp(comp.id)}>Eliminar</AlertDialogAction>
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
        </div>
    )
}
