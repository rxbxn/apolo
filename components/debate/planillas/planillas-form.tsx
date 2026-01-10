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
import {
    createPlanilla,
    updatePlanilla,
    getCoordinadoresForSelect,
    getMilitantesByCoordinador,
    type Planilla
} from '@/lib/actions/debate'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'

const formSchema = z.object({
    coordinador_id: z.string().uuid({ message: 'Selecciona un coordinador válido' }),
    militante_id: z.string().uuid({ message: 'Selecciona un militante válido' }),
    radicado: z.coerce.number().min(0, 'Debe ser un número positivo'),
    cautivo: z.coerce.number().min(0, 'Debe ser un número positivo'),
    marketing: z.coerce.number().min(0, 'Debe ser un número positivo'),
    impacto: z.coerce.number().min(0, 'Debe ser un número positivo'),
    fecha_planilla: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Fecha inválida',
    }),
})

interface PlanillasFormProps {
    planilla?: Planilla
    trigger?: React.ReactNode
}

export function PlanillasForm({ planilla, trigger }: PlanillasFormProps) {
    const [open, setOpen] = useState(false)
    const isEditing = !!planilla
    const [coordinadores, setCoordinadores] = useState<any[]>([])
    const [militantes, setMilitantes] = useState<any[]>([])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            coordinador_id: planilla?.coordinador_id || '',
            militante_id: planilla?.militante_id || '',
            radicado: planilla?.radicado || 0,
            cautivo: planilla?.cautivo || 0,
            marketing: planilla?.marketing || 0,
            impacto: planilla?.impacto || 0,
            fecha_planilla: planilla?.fecha_planilla || new Date().toISOString().split('T')[0],
        },
    })

    // Cargar coordinadores al abrir
    useEffect(() => {
        if (open) {
            const fetchCoordinadores = async () => {
                try {
                    const data = await getCoordinadoresForSelect()
                    if (data) setCoordinadores(data)
                } catch (error) {
                    console.error('Error cargando coordinadores:', error)
                    toast.error('Error al cargar coordinadores')
                }
            }
            fetchCoordinadores()
        }
    }, [open])

    // Cargar militantes cuando cambia el coordinador
    const selectedCoordinador = form.watch('coordinador_id')
    useEffect(() => {
        if (selectedCoordinador) {
            const fetchMilitantes = async () => {
                try {
                    const data = await getMilitantesByCoordinador(selectedCoordinador)
                    if (data) setMilitantes(data)
                } catch (error) {
                    console.error('Error cargando militantes:', error)
                    toast.error('Error al cargar militantes')
                }
            }
            fetchMilitantes()
        } else {
            setMilitantes([])
        }
    }, [selectedCoordinador])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const formData = new FormData()
            Object.entries(values).forEach(([key, value]) => {
                formData.append(key, String(value))
            })

            if (isEditing && planilla) {
                await updatePlanilla(planilla.id, formData)
                toast.success('Planilla actualizada correctamente')
            } else {
                await createPlanilla(formData)
                toast.success('Planilla creada correctamente')
            }
            setOpen(false)
            form.reset()
        } catch (error: any) {
            toast.error(error.message || 'Error al guardar la planilla')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Nueva Planilla
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Planilla' : 'Nueva Planilla'}</DialogTitle>
                    <DialogDescription>
                        Registra los datos de la planilla.
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
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCoordinador}>
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="radicado"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Radicado</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="cautivo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cautivo</FormLabel>
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
                                name="marketing"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Marketing</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="impacto"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Impacto</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="fecha_planilla"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fecha Planilla</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
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
