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
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    createGestion,
    updateGestion,
    FormularioGestion,
    getMilitantesActivos,
    getCoordinadoresActivos,
    getDirigentes,
    getLocalidades,
    getCatalogoOpciones,
    generarNumeroFormulario,
} from "@/lib/actions/gestion"
import { SolicitudesTable } from "./solicitudes-table"
import { Loader2, CalendarIcon, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

const formSchema = z.object({
    numero_formulario: z.string().min(1, "Número de formulario requerido"),
    fecha_necesidad: z.date({
        required_error: "Fecha de necesidad requerida",
    }),
    prioridad: z.string().min(1, "Prioridad requerida"),
    militante_id: z.string().optional(),
    dirigente_id: z.string().optional(),
    coordinador_id: z.string().optional(),
    telefono: z.string().optional(),
    localidad_id: z.string().optional(),
    receptor: z.string().optional(),
    estado_difusion: z.string().default('pendiente'),
    limpio_conteo: z.coerce.number().default(0),
    limpio_pendiente: z.coerce.number().default(0),
    codigo_lider: z.string().optional(),
    tipo_gestion: z.string().optional(),
    gestor_asignado: z.string().optional(),
    detalle_solicitud: z.string().optional(),
    autorizacion_total: z.coerce.number().default(0),
    fecha_entrega: z.date().optional(),
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

type FormData = z.infer<typeof formSchema>

interface SolicitudFormData {
    elemento: string
    unidad: string
    categoria: string
    sector: string
    cantidad: number
    orden: number
}

interface GestionFormProps {
    initialData?: FormularioGestion
    isEditing?: boolean
}

export function GestionFormNew({ initialData, isEditing = false }: GestionFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    
    // Estados para opciones
    const [militantes, setMilitantes] = useState<any[]>([])
    const [coordinadores, setCoordinadores] = useState<any[]>([])
    const [dirigentes, setDirigentes] = useState<any[]>([])
    const [localidades, setLocalidades] = useState<any[]>([])
    const [elementos, setElementos] = useState<any[]>([])
    const [unidades, setUnidades] = useState<any[]>([])
    const [categorias, setCategorias] = useState<any[]>([])
    const [sectores, setSectores] = useState<any[]>([])
    const [tiposGestion, setTiposGestion] = useState<any[]>([])

    // Estados para solicitudes
    const [solicitudes, setSolicitudes] = useState<SolicitudFormData[]>([])
    const [nuevaSolicitud, setNuevaSolicitud] = useState<Partial<SolicitudFormData>>({
        elemento: '',
        unidad: '',
        categoria: '',
        sector: '',
        cantidad: 0,
        orden: 1
    })

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            numero_formulario: initialData?.numero_formulario || "",
            fecha_necesidad: initialData?.fecha_necesidad ? new Date(initialData.fecha_necesidad) : undefined,
            prioridad: initialData?.prioridad || "",
            militante_id: initialData?.militante_id || "",
            dirigente_id: initialData?.dirigente_id || "",
            coordinador_id: initialData?.coordinador_id || "",
            telefono: initialData?.telefono || "",
            localidad_id: initialData?.localidad || "",
            receptor: initialData?.receptor || "",
            estado_difusion: initialData?.estado_difusion || 'pendiente',
            limpio_conteo: initialData?.limpio_conteo || 0,
            limpio_pendiente: initialData?.limpio_pendiente || 0,
            codigo_lider: initialData?.codigo_lider || "",
            tipo_gestion: initialData?.tipo_gestion || "",
            gestor_asignado: initialData?.gestor_asignado || "",
            detalle_solicitud: initialData?.detalle_solicitud || "",
            autorizacion_total: initialData?.autorizacion_total || 0,
            fecha_entrega: initialData?.fecha_entrega ? new Date(initialData.fecha_entrega) : undefined,
            observaciones_prioridad: initialData?.observaciones_prioridad || "",
            observaciones_generales: initialData?.observaciones_generales || "",
            solicitudes: initialData?.solicitudes || [],
        },
    })

    useEffect(() => {
        loadData()
        if (initialData?.solicitudes) {
            setSolicitudes(initialData.solicitudes.map((s, index) => ({
                ...s,
                orden: s.orden || index + 1
            })))
        }
        
        // Generar número de formulario automáticamente si es nuevo
        if (!isEditing && !initialData?.numero_formulario) {
            generarNumeroFormulario().then(numero => {
                form.setValue('numero_formulario', numero)
            })
        }
    }, [initialData, isEditing, form])

    async function loadData() {
        try {
            const [
                militantesData,
                coordinadoresData,
                dirigentesData,
                localidadesData,
                elementosData,
                unidadesData,
                categoriasData,
                sectoresData,
                tiposGestionData
            ] = await Promise.all([
                getMilitantesActivos(),
                getCoordinadoresActivos(),
                getDirigentes(),
                getLocalidades(),
                getCatalogoOpciones('elemento'),
                getCatalogoOpciones('unidad'),
                getCatalogoOpciones('categoria'),
                getCatalogoOpciones('sector'),
                getCatalogoOpciones('tipo_gestion')
            ])

            setMilitantes(militantesData)
            setCoordinadores(coordinadoresData)
            setDirigentes(dirigentesData)
            setLocalidades(localidadesData)
            setElementos(elementosData)
            setUnidades(unidadesData)
            setCategorias(categoriasData)
            setSectores(sectoresData)
            setTiposGestion(tiposGestionData)
        } catch (error) {
            console.error("Error loading data:", error)
            toast.error("Error cargando los datos")
        }
    }

    function agregarSolicitud() {
        if (!nuevaSolicitud.elemento || !nuevaSolicitud.unidad || !nuevaSolicitud.categoria || !nuevaSolicitud.sector) {
            toast.error("Complete todos los campos de la solicitud")
            return
        }

        const solicitud: SolicitudFormData = {
            elemento: nuevaSolicitud.elemento!,
            unidad: nuevaSolicitud.unidad!,
            categoria: nuevaSolicitud.categoria!,
            sector: nuevaSolicitud.sector!,
            cantidad: nuevaSolicitud.cantidad || 1,
            orden: solicitudes.length + 1
        }

        setSolicitudes([...solicitudes, solicitud])
        setNuevaSolicitud({
            elemento: '',
            unidad: '',
            categoria: '',
            sector: '',
            cantidad: 0,
            orden: solicitudes.length + 2
        })
    }

    function eliminarSolicitud(index: number) {
        const nuevasSolicitudes = solicitudes.filter((_, i) => i !== index)
        setSolicitudes(nuevasSolicitudes.map((s, i) => ({ ...s, orden: i + 1 })))
    }

    async function onSubmit(values: FormData) {
        setLoading(true)
        try {
            const formData: FormularioGestion = {
                ...values,
                localidad: values.localidad_id, // Mapear localidad_id a localidad
                fecha_necesidad: values.fecha_necesidad.toISOString().split('T')[0],
                fecha_entrega: values.fecha_entrega?.toISOString().split('T')[0],
                solicitudes: solicitudes,
                estado: 'borrador'
            }
            
            // Eliminar localidad_id del objeto final
            delete (formData as any).localidad_id

            if (isEditing && initialData?.id) {
                await updateGestion(initialData.id, formData)
                toast.success("Formato actualizado exitosamente")
            } else {
                await createGestion(formData)
                toast.success("Formato creado exitosamente")
            }

            router.push("/dashboard/gestion-gerencial")
        } catch (error) {
            console.error("Error submitting form:", error)
            toast.error("Error al guardar el formato")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Encabezado del Formulario */}
                <Card>
                    <CardHeader>
                        <CardTitle>Encabezado del Formulario</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField
                            control={form.control}
                            name="numero_formulario"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>No. Formulario *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: GG-001" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="fecha_necesidad"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de Necesidad *</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Seleccionar fecha</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="prioridad"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Prioridad *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar prioridad" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="alta">Alta</SelectItem>
                                            <SelectItem value="media">Media</SelectItem>
                                            <SelectItem value="baja">Baja</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Información Personal y Contacto */}
                <Card>
                    <CardHeader>
                        <CardTitle>Información Personal y Contacto</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="militante_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Militante</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar militante" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {militantes.map((militante) => (
                                                <SelectItem key={militante.id} value={militante.id}>
                                                    {militante.nombre} - {militante.documento}
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
                            name="dirigente_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirigente</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar dirigente" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {dirigentes.map((dirigente) => (
                                                <SelectItem key={dirigente.id} value={dirigente.id}>
                                                    {dirigente.nombre} - {dirigente.perfil_nombre}
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
                            name="coordinador_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Coordinador</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar coordinador" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {coordinadores.map((coordinador) => (
                                                <SelectItem key={coordinador.id} value={coordinador.id}>
                                                    {coordinador.nombre} - {coordinador.tipo}
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
                                        <Input placeholder="Ej: +57 300 123 4567" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="localidad_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Localidad</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar localidad" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {localidades.map((localidad) => (
                                                <SelectItem key={localidad.id} value={localidad.id}>
                                                    {localidad.codigo ? `${localidad.nombre} (${localidad.codigo})` : localidad.nombre}
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
                            name="receptor"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Receptor</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nombre del receptor" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Indicadores */}
                <Card>
                    <CardHeader>
                        <CardTitle>Indicadores</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FormField
                            control={form.control}
                            name="estado_difusion"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado de Difusión</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar estado" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="pendiente">Pendiente</SelectItem>
                                            <SelectItem value="en_proceso">En Proceso</SelectItem>
                                            <SelectItem value="completado">Completado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="limpio_conteo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Limpio Conteo</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0" {...field} />
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
                                    <FormLabel>Limpio Pendiente</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="codigo_lider"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Código Líder</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: LDR-001" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Tipo de Gestión */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tipo de Gestión</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="tipo_gestion"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Gestión</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {tiposGestion.map((tipo) => (
                                                <SelectItem key={tipo.id} value={tipo.codigo}>
                                                    {tipo.nombre}
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
                            name="gestor_asignado"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Gestor Asignado</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nombre del gestor responsable" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="md:col-span-2">
                            <FormField
                                control={form.control}
                                name="detalle_solicitud"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Detalle de la Solicitud</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Descripción detallada de la solicitud..."
                                                className="min-h-[100px]"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Solicitudes Dinámicas */}
                <Card>
                    <CardHeader>
                        <CardTitle>Solicitudes de Elementos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Formulario para nueva solicitud */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 border rounded-lg">
                            <div>
                                <label className="text-sm font-medium">Elemento</label>
                                <Select 
                                    value={nuevaSolicitud.elemento} 
                                    onValueChange={(value) => setNuevaSolicitud(prev => ({...prev, elemento: value}))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {elementos.map((elemento) => (
                                            <SelectItem key={elemento.id} value={elemento.nombre}>
                                                {elemento.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Unidad</label>
                                <Select 
                                    value={nuevaSolicitud.unidad} 
                                    onValueChange={(value) => setNuevaSolicitud(prev => ({...prev, unidad: value}))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {unidades.map((unidad) => (
                                            <SelectItem key={unidad.id} value={unidad.nombre}>
                                                {unidad.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Categoría</label>
                                <Select 
                                    value={nuevaSolicitud.categoria} 
                                    onValueChange={(value) => setNuevaSolicitud(prev => ({...prev, categoria: value}))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categorias.map((categoria) => (
                                            <SelectItem key={categoria.id} value={categoria.nombre}>
                                                {categoria.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Sector</label>
                                <Select 
                                    value={nuevaSolicitud.sector} 
                                    onValueChange={(value) => setNuevaSolicitud(prev => ({...prev, sector: value}))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sectores.map((sector) => (
                                            <SelectItem key={sector.id} value={sector.nombre}>
                                                {sector.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-sm font-medium">Cantidad</label>
                                    <Input 
                                        type="number" 
                                        placeholder="0"
                                        value={nuevaSolicitud.cantidad || 0}
                                        onChange={(e) => setNuevaSolicitud(prev => ({...prev, cantidad: parseInt(e.target.value) || 0}))}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button type="button" onClick={agregarSolicitud}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Lista de solicitudes */}
                        {solicitudes.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <div className="grid grid-cols-6 gap-4 p-3 bg-gray-50 font-medium text-sm">
                                    <div>Elemento</div>
                                    <div>Unidad</div>
                                    <div>Categoría</div>
                                    <div>Sector</div>
                                    <div>Cantidad</div>
                                    <div>Acciones</div>
                                </div>
                                {solicitudes.map((solicitud, index) => (
                                    <div key={index} className="grid grid-cols-6 gap-4 p-3 border-t">
                                        <div>{solicitud.elemento}</div>
                                        <div>{solicitud.unidad}</div>
                                        <div>{solicitud.categoria}</div>
                                        <div>{solicitud.sector}</div>
                                        <div>{solicitud.cantidad}</div>
                                        <div>
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => eliminarSolicitud(index)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Autorización y Observaciones */}
                <Card>
                    <CardHeader>
                        <CardTitle>Autorización y Observaciones</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="autorizacion_total"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Autorización Total</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="fecha_entrega"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de Entrega</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Seleccionar fecha</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="md:col-span-2">
                            <FormField
                                control={form.control}
                                name="observaciones_prioridad"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Observaciones de Prioridad</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Observaciones relacionadas con la prioridad..."
                                                className="min-h-[100px]"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <FormField
                                control={form.control}
                                name="observaciones_generales"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Observaciones Generales</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Observaciones generales del formulario..."
                                                className="min-h-[100px]"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Botones de acción */}
                <div className="flex justify-end space-x-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/dashboard/gestion-gerencial")}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? "Actualizar" : "Crear"} Formato
                    </Button>
                </div>
            </form>
        </Form>
    )
}