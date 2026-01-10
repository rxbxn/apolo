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
import { createVehiculoAmigo, updateVehiculoAmigo, type VehiculoAmigo } from '@/lib/actions/debate'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const formSchema = z.object({
    coordinador_id: z.string().uuid({ message: 'Selecciona un coordinador válido' }),
    propietario: z.string().min(1, 'El propietario es requerido'),
    placa: z.string().min(1, 'La placa es requerida'),
    tipo_vehiculo: z.string().optional(),
    fecha_registro: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Fecha inválida',
    }),
    observaciones: z.string().optional(),
})

interface VehiculoAmigoFormProps {
    vehiculo?: VehiculoAmigo
    trigger?: React.ReactNode
}

export function VehiculoAmigoForm({ vehiculo, trigger }: VehiculoAmigoFormProps) {
    const [open, setOpen] = useState(false)
    const isEditing = !!vehiculo
    const [coordinadores, setCoordinadores] = useState<any[]>([])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            coordinador_id: vehiculo?.coordinador_id || '',
            propietario: vehiculo?.propietario || '',
            placa: vehiculo?.placa || '',
            tipo_vehiculo: vehiculo?.tipo_vehiculo || '',
            fecha_registro: vehiculo?.fecha_registro || new Date().toISOString().split('T')[0],
            observaciones: vehiculo?.observaciones || '',
        },
    })

    useEffect(() => {
        if (open) {
            const fetchCoordinadores = async () => {
                const supabase = createClient()
                const { data } = await supabase
                    .from('coordinadores')
                    .select('id, usuario:usuarios(nombres, apellidos)')
                if (data) setCoordinadores(data)
            }
            fetchCoordinadores()
        }
    }, [open])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const formData = new FormData()
            Object.entries(values).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    formData.append(key, String(value))
                }
            })

            if (isEditing && vehiculo) {
                await updateVehiculoAmigo(vehiculo.id, formData)
                toast.success('Vehículo actualizado correctamente')
            } else {
                await createVehiculoAmigo(formData)
                toast.success('Vehículo creado correctamente')
            }
            setOpen(false)
            form.reset()
        } catch (error: any) {
            toast.error(error.message || 'Error al guardar el vehículo')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Vehículo
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Vehículo' : 'Nuevo Vehículo'}</DialogTitle>
                    <DialogDescription>
                        Registra los datos del vehículo amigo.
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
                                name="propietario"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Propietario</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="placa"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Placa</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="tipo_vehiculo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo Vehículo</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona tipo" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="automovil">Automóvil</SelectItem>
                                                <SelectItem value="camioneta">Camioneta</SelectItem>
                                                <SelectItem value="bus">Bus</SelectItem>
                                                <SelectItem value="moto">Moto</SelectItem>
                                                <SelectItem value="otro">Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fecha_registro"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha Registro</FormLabel>
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
                            name="observaciones"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observaciones</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
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
