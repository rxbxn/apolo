"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    createGestion,
    updateGestion,
    FormatoGestion,
    getUsuariosForSelect,
} from "@/lib/actions/gestion"
import { getCoordinadoresForSelect, getMilitantesByCoordinador } from "@/lib/actions/debate"
import { SolicitudesTable } from "./solicitudes-table"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

const formSchema = z.object({
    numero_formulario: z.string().min(1, "Requerido"),
    militante: z.string().min(1, "Requerido"),
    dirigente: z.string().optional(),
    coordinador: z.string().optional(),
    telefono: z.string().optional(),
    localidad: z.string().optional(),
    receptor: z.string().optional(),
    estado_difusion: z.boolean().default(false),
    limpio_count: z.coerce.number().default(0),
    limpio_pendiente: z.coerce.number().default(0),
    lider_codigo: z.string().optional(),
    tipo_gestion: z.string().optional(),
    gestor_asignado: z.string().optional(),
    solicitud: z.string().optional(),
    fecha_necesidad: z.string().optional(), // Using string for date input simplicity or Date object
    autorizacion_total: z.coerce.number().default(0),
    entregas_fecha: z.string().optional(),
    prioridad: z.string().optional(),
    observaciones_prioridad: z.string().optional(),
    observaciones_generales: z.string().optional(),
    solicitudes: z.array(
        z.object({
            elemento: z.string(),
            unidad: z.string(),
            categoria: z.string(),
            sector: z.string(),
            cantidad: z.coerce.number(),
            orden: z.number(),
        })
    ).optional(),
})

interface GestionFormProps {
    initialData?: FormatoGestion
    isEditing?: boolean
}

export function GestionForm({ initialData, isEditing = false }: GestionFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [coordinadores, setCoordinadores] = useState<any[]>([])
    const [militantes, setMilitantes] = useState<any[]>([])
    const [usuarios, setUsuarios] = useState<any[]>([])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData || {
            numero_formulario: "",
            militante: "",
            dirigente: "",
            coordinador: "",
            telefono: "",
            localidad: "",
            receptor: "",
            estado_difusion: false,
            limpio_count: 0,
            limpio_pendiente: 0,
            lider_codigo: "",
            tipo_gestion: "",
            gestor_asignado: "",
            solicitud: "",
            fecha_necesidad: new Date().toISOString().split('T')[0],
            autorizacion_total: 0,
            entregas_fecha: new Date().toISOString().split('T')[0],
            prioridad: "",
            observaciones_prioridad: "",
            observaciones_generales: "",
            solicitudes: [],
        },
    })

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [coordsData, usersData] = await Promise.all([
                    getCoordinadoresForSelect(),
                    getUsuariosForSelect(),
                ])
                setCoordinadores(coordsData || [])
                setUsuarios(usersData || [])
            } catch (error) {
                console.error("Error loading catalogs:", error)
                toast.error("Error al cargar catálogos")
            }
        }
        fetchData()
    }, [])

    // Fetch militantes when coordinador changes (if applicable) or just fetch all if no filter needed
    // Since the schema uses text for militante, but we likely want a select, we'll fetch all or filter.
    // For now, let's just fetch all militantes if no coordinator selected, or filter if selected.
    // But `getMilitantesByCoordinador` requires an ID.
    // If the user selects a coordinator, we fetch their militants.
    // If not, maybe we show empty or all? Let's assume coordinator is selected first or we fetch generic list.
    // Given the prompt didn't specify strict dependency, but previous modules did, I'll try to use the dependency if possible.
    // However, `militante` field is just a string name in the new schema.
    // I will use a simple input for now or a select if I can get the list.
    // Let's use the `usuarios` list for militantes too as a fallback, or try to fetch militants.
    // Actually, `militante` field in schema is VARCHAR.

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true)
        try {
            if (isEditing && initialData?.id) {
                await updateGestion(initialData.id, values as any)
                toast.success("Formato actualizado correctamente")
            } else {
                await createGestion(values as any)
                toast.success("Formato creado correctamente")
                router.push("/dashboard/gestion-gerencial")
            }
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar el formato")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* ENCABEZADO */}
                <Card>
                    <CardHeader>
                        <CardTitle>Encabezado del Formulario</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <FormField
                            control={form.control}
                            name="numero_formulario"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número de Formulario</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: 001" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="fecha_necesidad"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fecha de Necesidad</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="prioridad"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Prioridad</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Alta">Alta</SelectItem>
                                            <SelectItem value="Media">Media</SelectItem>
                                            <SelectItem value="Baja">Baja</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* INFORMACIÓN PERSONAL Y CONTACTO */}
                <Card>
                    <CardHeader>
                        <CardTitle>Información Personal y Contacto</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <FormField
                            control={form.control}
                            name="militante"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Militante</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nombre del militante" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dirigente"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirigente</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {usuarios.map((u) => (
                                                <SelectItem key={u.id} value={`${u.nombres} ${u.apellidos}`}>
                                                    {u.nombres} {u.apellidos}
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
                            name="coordinador"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Coordinador</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {coordinadores.map((c) => (
                                                <SelectItem key={c.id} value={`${c.usuario?.nombres} ${c.usuario?.apellidos}`}>
                                                    {c.usuario?.nombres} {c.usuario?.apellidos}
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
                            name="telefono"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Teléfono</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Teléfono de contacto" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="localidad"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Localidad</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Localidad" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="receptor"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Receptor</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {usuarios.map((u) => (
                                                <SelectItem key={u.id} value={`${u.nombres} ${u.apellidos}`}>
                                                    {u.nombres} {u.apellidos}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* BADGES E INDICADORES */}
                <Card>
                    <CardHeader>
                        <CardTitle>Indicadores</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-4">
                        <FormField
                            control={form.control}
                            name="estado_difusion"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Estado Difusión
                                        </FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="limpio_count"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Limpio (Conteo)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="limpio_pendiente"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Limpio (Pendiente)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="lider_codigo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Código Líder</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tipo_gestion"
                            render={({ field }) => (
                                <FormItem className="col-span-2">
                                    <FormLabel>Tipo de Gestión</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="GESTIÓN PRIVADA">GESTIÓN PRIVADA</SelectItem>
                                            <SelectItem value="GESTIÓN PÚBLICA">GESTIÓN PÚBLICA</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* SOLICITUD Y GESTOR */}
                <Card>
                    <CardHeader>
                        <CardTitle>Solicitud y Gestor</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="gestor_asignado"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Gestor Asignado</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nombre del gestor" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="solicitud"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Detalle de la Solicitud</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Describa la solicitud..." className="min-h-[100px]" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* SOLICITUDES DE GESTIÓN (TABLA DINÁMICA) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Solicitudes de Gestión</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="solicitudes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <SolicitudesTable
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* AUTORIZACIÓN Y OBSERVACIONES */}
                <Card>
                    <CardHeader>
                        <CardTitle>Autorización y Observaciones</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="autorizacion_total"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Autorización Total ($)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="entregas_fecha"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha de Entrega</FormLabel>
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
                            name="observaciones_prioridad"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observaciones de Prioridad</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Observaciones sobre la prioridad..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="observaciones_generales"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observaciones Generales</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Observaciones generales..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <div className="flex justify-end space-x-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? "Actualizar Formato" : "Guardar Formato"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
