'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { createInconsistencia, updateInconsistencia, getCoordinadoresForSelect, getMilitantesByCoordinador, type Inconsistencia } from '@/lib/actions/debate'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

const formSchema = z.object({
    coordinador_id: z.string().uuid({ message: 'Selecciona un coordinador válido' }),
    militante_id: z.string().uuid({ message: 'Selecciona un militante válido' }).optional().or(z.literal('')),
    radical: z.coerce.number().min(0, 'Debe ser un número positivo'),
    exclusion: z.coerce.number().min(0, 'Debe ser un número positivo'),
    fuera_barranquilla: z.coerce.number().min(0, 'Debe ser un número positivo'),
    fecha_inconsistencia: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Fecha inválida',
    }),
    fecha_resolucion: z.string().optional(),
    cantidad_resuelto: z.coerce.number().optional(),
})

interface InconsistenciasFormProps {
    inconsistencia?: Inconsistencia
    trigger?: React.ReactNode
}

export function InconsistenciasForm({ inconsistencia, trigger }: InconsistenciasFormProps) {
    const [open, setOpen] = useState(false)
    const isEditing = !!inconsistencia
    const [coordinadores, setCoordinadores] = useState<any[]>([])
    const [militantes, setMilitantes] = useState<any[]>([])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            coordinador_id: inconsistencia?.coordinador_id || '',
            militante_id: inconsistencia?.militante_id || '',
            radical: inconsistencia?.radical || 0,
            exclusion: inconsistencia?.exclusion || 0,
            fuera_barranquilla: inconsistencia?.fuera_barranquilla || 0,
            fecha_inconsistencia: inconsistencia?.fecha_inconsistencia || new Date().toISOString().split('T')[0],
            fecha_resolucion: inconsistencia?.fecha_resolucion || '',
            cantidad_resuelto: inconsistencia?.cantidad_resuelto || 0,
        },
    })

    const selectedCoordinadorId = form.watch('coordinador_id')

    useEffect(() => {
        if (open) {
            getCoordinadoresForSelect().then(setCoordinadores).catch(console.error)
        }
    }, [open])

    useEffect(() => {
        if (selectedCoordinadorId) {
            getMilitantesByCoordinador(selectedCoordinadorId).then(setMilitantes).catch(console.error)
        } else {
            setMilitantes([])
        }
    }, [selectedCoordinadorId])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const formData = new FormData()
            Object.entries(values).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    formData.append(key, String(value))
                }
            })

            if (isEditing && inconsistencia) {
                await updateInconsistencia(inconsistencia.id, formData)
                toast.success('Inconsistencia actualizada correctamente')
            } else {
                await createInconsistencia(formData)
                toast.success('Inconsistencia creada correctamente')
            }
            setOpen(false)
            form.reset()
        } catch (error: any) {
            toast.error(error.message || 'Error al guardar la inconsistencia')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Nueva Inconsistencia
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Inconsistencia' : 'Nueva Inconsistencia'}</DialogTitle>
                    <DialogDescription>
                        Registra los datos de la inconsistencia.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="coordinador_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Coordinador</FormLabel>
                                        <Select onValueChange={(value) => {
                                            field.onChange(value)
                                            form.setValue('militante_id', '') // Reset militante when coordinador changes
                                        }} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona un coordinador" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {coordinadores.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.usuario.nombres} {c.usuario.apellidos}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="militante_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Militante</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCoordinadorId}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona un militante" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {militantes.map((m) => (
                                                    <SelectItem key={m.id} value={m.id}>
                                                        {m.usuario.nombres} {m.usuario.apellidos} ({m.tipo})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="radical"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Radical</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="exclusion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Exclusión</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fuera_barranquilla"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fuera B/quilla</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="fecha_inconsistencia"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha Inconsistencia</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fecha_resolucion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha Resolución</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="cantidad_resuelto"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cantidad Resuelto</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
