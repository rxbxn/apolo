"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Check, Pencil, Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
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
} from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"

type TipoMilitante = Database['public']['Tables']['tipos_militante']['Row']

// Esquema de validación
const tipoMilitanteSchema = z.object({
    codigo: z.preprocess(
        (val) => parseInt(z.string().parse(val), 10),
        z.number().min(1, "El código debe ser un número positivo")
    ),
    descripcion: z.preprocess(
        (val) => z.string().parse(val).toUpperCase(),
        z.string().min(3, "La descripción debe tener al menos 3 caracteres")
    ),
})

type TipoMilitanteFormValues = z.infer<typeof tipoMilitanteSchema>

export function TiposMilitanteForm() {
    const [submitting, setSubmitting] = useState(false)
    const [tipos, setTipos] = useState<TipoMilitante[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTipo, setEditingTipo] = useState<TipoMilitante | null>(null)
    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<TipoMilitanteFormValues>({
        resolver: zodResolver(tipoMilitanteSchema),
    })

    const cargarTipos = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('tipos_militante')
                .select('*')
                .order('codigo', { ascending: true })
            
            if (error) throw error
            setTipos(data || [])
        } catch (error) {
            console.error('Error cargando tipos:', error)
            toast.error('Error al cargar los tipos de militante')
        } finally {
            setLoading(false)
        }
    }

    const crearTipo = async (tipoData: TipoMilitanteFormValues) => {
        const supabaseClient = supabase as any
        const { data, error } = await supabaseClient
            .from('tipos_militante')
            .insert({
                codigo: tipoData.codigo,
                descripcion: tipoData.descripcion.toUpperCase()
            })
            .select()
            .single()

        if (error) throw error
        return data
    }

    const resetForm = () => {
        reset()
        setEditingTipo(null)
        setIsDialogOpen(false)
    }

    const handleEdit = (tipo: TipoMilitante) => {
        setEditingTipo(tipo)
        reset({
            codigo: tipo.codigo,
            descripcion: tipo.descripcion.toUpperCase()
        })
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: string) => {
        try {
            setSubmitting(true)
            const supabaseClient = supabase as any
            const { error } = await supabaseClient
                .from('tipos_militante')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast.success("Tipo de militante eliminado exitosamente")
            await cargarTipos()
        } catch (error) {
            console.error("Error eliminando tipo de militante:", error)
            toast.error(error instanceof Error ? error.message : "Error al eliminar el tipo de militante")
        } finally {
            setSubmitting(false)
        }
    }

    useEffect(() => {
        cargarTipos()
    }, [])

    async function onSubmit(data: TipoMilitanteFormValues) {
        try {
            setSubmitting(true)
            
            if (editingTipo) {
                // Actualizar tipo existente (bypass de tipos temporalmente)
                const supabaseClient = supabase as any
                const { error } = await supabaseClient
                    .from('tipos_militante')
                    .update({
                        codigo: data.codigo,
                        descripcion: data.descripcion.toUpperCase()
                    })
                    .eq('id', editingTipo.id)
                
                if (error) throw error
                toast.success("Tipo de militante actualizado exitosamente")
            } else {
                // Crear nuevo tipo
                await crearTipo(data)
                toast.success("Tipo de militante creado exitosamente")
            }
            
            resetForm()
            await cargarTipos()
        } catch (error) {
            console.error("Error guardando tipo de militante:", error)
            toast.error(error instanceof Error ? error.message : "Error al guardar el tipo de militante")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Gestión de Tipos de Militante</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Tipo
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingTipo ? 'Editar Tipo de Militante' : 'Nuevo Tipo de Militante'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="codigo">Código</Label>
                                <Input
                                    id="codigo"
                                    type="text"
                                    {...register("codigo")}
                                />
                                {errors.codigo && <p className="text-sm text-destructive">{errors.codigo.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="descripcion">Descripción</Label>
                                <Input
                                    id="descripcion"
                                    {...register("descripcion", {
                                        onChange: (e) => {
                                            e.target.value = e.target.value.toUpperCase()
                                        }
                                    })}
                                    style={{ textTransform: 'uppercase' }}
                                />
                                {errors.descripcion && <p className="text-sm text-destructive">{errors.descripcion.message}</p>}
                            </div>

                            <div className="flex justify-end space-x-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={submitting || loading}>
                                    {submitting || loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            {editingTipo ? "ACTUALIZANDO..." : "GUARDANDO..."}
                                        </>
                                    ) : (
                                        <>
                                            {editingTipo ? "ACTUALIZAR" : "GUARDAR"} <Save className="w-4 h-4 ml-2" />
                                        </>
                                    )}
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
                            <TableHead>Código</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center">
                                    <Loader2 className="w-6 h-6 animate-spin inline-block" />
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && tipos.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                    No hay tipos de militante registrados.
                                </TableCell>
                            </TableRow>
                        )}
                        {tipos.map(tipo => (
                            <TableRow key={tipo.id}>
                                <TableCell>{tipo.codigo}</TableCell>
                                <TableCell className="uppercase">{tipo.descripcion}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(tipo)}>
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
                                                        Esta acción no se puede deshacer. Eliminará el tipo de militante y podría afectar a los registros asociados.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(tipo.id)}>
                                                        Eliminar
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
