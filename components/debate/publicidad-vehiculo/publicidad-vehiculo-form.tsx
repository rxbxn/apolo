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
import { createPublicidadVehiculo, updatePublicidadVehiculo, type PublicidadVehiculo } from '@/lib/actions/debate'
import { getCiudades, getBarrios } from '@/lib/actions/configuracion'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const formSchema = z.object({
    coordinador_id: z.string().uuid({ message: 'Selecciona un coordinador válido' }),
    tipo_publicidad: z.string().optional(),
    medidas: z.string().optional(),
    ciudad_id: z.string().uuid({ message: 'Selecciona una ciudad válida' }),
    barrio_id: z.string().uuid({ message: 'Selecciona un barrio válido' }),
    fecha_instalacion: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Fecha inválida',
    }),
    fecha_desinstalacion: z.string().optional(),
})

interface PublicidadVehiculoFormProps {
    publicidad?: PublicidadVehiculo
    trigger?: React.ReactNode
}

export function PublicidadVehiculoForm({ publicidad, trigger }: PublicidadVehiculoFormProps) {
    const [open, setOpen] = useState(false)
    const isEditing = !!publicidad
    const [coordinadores, setCoordinadores] = useState<any[]>([])
    const [ciudades, setCiudades] = useState<any[]>([])
    const [barrios, setBarrios] = useState<any[]>([])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            coordinador_id: publicidad?.coordinador_id || '',
            tipo_publicidad: publicidad?.tipo_publicidad || '',
            medidas: publicidad?.medidas || '',
            ciudad_id: publicidad?.ciudad_id || '',
            barrio_id: publicidad?.barrio_id || '',
            fecha_instalacion: publicidad?.fecha_instalacion || new Date().toISOString().split('T')[0],
            fecha_desinstalacion: publicidad?.fecha_desinstalacion || '',
        },
    })

    useEffect(() => {
        if (open) {
            const fetchData = async () => {
                const supabase = createClient()
                const { data: coords } = await supabase
                    .from('coordinadores')
                    .select('id, usuario:usuarios(nombres, apellidos)')
                if (coords) setCoordinadores(coords)
            }
            fetchData()
            getCiudades().then(setCiudades).catch(console.error)
        }
    }, [open])

    const selectedCiudad = form.watch('ciudad_id')
    useEffect(() => {
        if (selectedCiudad) {
            getBarrios(selectedCiudad).then(setBarrios).catch(console.error)
        } else {
            setBarrios([])
        }
    }, [selectedCiudad])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const formData = new FormData()
            Object.entries(values).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    formData.append(key, String(value))
                }
            })

            if (isEditing && publicidad) {
                await updatePublicidadVehiculo(publicidad.id, formData)
                toast.success('Publicidad actualizada correctamente')
            } else {
                await createPublicidadVehiculo(formData)
                toast.success('Publicidad creada correctamente')
            }
            setOpen(false)
            form.reset()
        } catch (error: any) {
            toast.error(error.message || 'Error al guardar la publicidad')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Nueva Publicidad
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Publicidad' : 'Nueva Publicidad'}</DialogTitle>
                    <DialogDescription>
                        Registra los datos de la publicidad en vehículo.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="tipo_publicidad"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo Publicidad</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona tipo" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="microperforado">Microperforado</SelectItem>
                                                <SelectItem value="calcomania">Calcomanía</SelectItem>
                                                <SelectItem value="otro">Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="medidas"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Medidas</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ej: 1x0.5m" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="ciudad_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ciudad</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona una ciudad" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {ciudades.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.nombre}
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
                                name="barrio_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Barrio</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCiudad}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona un barrio" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {barrios.map((b) => (
                                                    <SelectItem key={b.id} value={b.id}>
                                                        {b.nombre}
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
                                name="fecha_instalacion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha Instalación</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fecha_desinstalacion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha Desinstalación</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
