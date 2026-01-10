"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, X, UserCheck, Key, User, Tag, Eye, EyeOff } from "lucide-react"
import { useCoordinadores } from "@/lib/hooks/use-coordinadores"
import { usePersonas } from "@/lib/hooks/use-personas"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"
import { usePermisos } from "@/lib/hooks/use-permisos"

interface CoordinadorFormProps {
    initialData?: any
    isEditing?: boolean
}

interface CoordinadorFormValues {
    usuario_id: string
    email: string
    password?: string
    perfil_id?: string
    referencia_coordinador_id?: string
    tipo: 'Coordinador' | 'Estructurador'
}

export function CoordinadorForm({ initialData, isEditing = false }: CoordinadorFormProps) {
    const router = useRouter()
    const { crear, actualizar, loading } = useCoordinadores()
    const { buscarReferentes } = usePersonas()
    const [submitting, setSubmitting] = useState(false)

    // Estados para los combobox
    const [openPersona, setOpenPersona] = useState(false)
    const [personasSearch, setPersonasSearch] = useState("")
    const [personas, setPersonas] = useState<any[]>([])
    const [loadingPersonas, setLoadingPersonas] = useState(false)

    const [openReferencia, setOpenReferencia] = useState(false)
    const [referenciaSearch, setReferenciaSearch] = useState("")
    const [referencias, setReferencias] = useState<any[]>([])
    const [loadingReferencias, setLoadingReferencias] = useState(false)

    const [perfiles, setPerfiles] = useState<any[]>([])

    // Esquema dinámico según si estamos editando
    const coordinadorSchema = z.object({
        usuario_id: z.string().min(1, "Debe seleccionar una persona"),
        email: z.string().email("Email inválido").min(1, "El email es requerido"),
        password: isEditing
            ? z.preprocess((val) => (val === '' ? undefined : val), z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional())
            : z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
        perfil_id: z.string().optional(),
        referencia_coordinador_id: z.string().optional(),
        tipo: z.enum(["Coordinador", "Estructurador"], {
            required_error: "Debe seleccionar un tipo (Coordinador o Estructurador)",
        }),
    })

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
        reset,
        getValues,
        setError,
    } = useForm<CoordinadorFormValues>({
        resolver: zodResolver(coordinadorSchema),
        defaultValues: initialData || {
            usuario_id: "",
            email: "",
            password: "",
            perfil_id: "",
            referencia_coordinador_id: "",
            tipo: "Coordinador",
        },
    })

    const { permisos } = usePermisos("Módulo Coordinador")
    const [authUserId, setAuthUserId] = useState<string | null>(initialData?.auth_user_id || null)
    const [creatingAuthUser, setCreatingAuthUser] = useState(false)

    // Mostrar / ocultar contraseña en el input
    const [showPassword, setShowPassword] = useState(false)

    // Si `initialData` cambia (llega desde la API), resetear los valores del formulario
    useEffect(() => {
        if (initialData) {
            // Asegura que el campo password se resetea si viene desde la API
            reset({
                usuario_id: initialData.usuario_id || '',
                email: initialData.email || '',
                password: initialData.password || '',
                perfil_id: initialData.perfil_id || '',
                referencia_coordinador_id: initialData.referencia_coordinador_id || '',
                tipo: initialData.tipo || 'Coordinador',
            })
            setAuthUserId(initialData.auth_user_id || null)
        }
    }, [initialData, reset])

    async function handleToggleShowPassword() {
        // Mostrar u ocultar contraseña (sin restricción de permisos en frontend)
        const currentPassword = getValues('password')
        if ((!currentPassword || currentPassword === '') && isEditing && initialData?.coordinador_id) {
            // Validar el formato del coordinador_id antes de llamar a la API
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            // Sanitizar coordinador_id
            const rawId = initialData.coordinador_id
            const sanitizedId = typeof rawId === 'string' ? rawId.trim().replace(/^"|"$/g, '') : String(rawId || '')
            if (!uuidRegex.test(sanitizedId)) {
                console.warn('Coordinador ID inválido, omitiendo petición de contraseña:', initialData.coordinador_id)
            } else {
                // Intentar obtener la contraseña del servidor (si no viene pre-cargada)
                try {
                    const res = await fetch(`/api/coordinador/${sanitizedId}`)
                    if (res.ok) {
                        const data = await res.json()
                        if (data.password) {
                            setValue('password', data.password)
                        }
                    } else if (res.status === 403) {
                        toast.error('No autorizado para ver la contraseña')
                    }
                } catch (e) {
                    console.warn('No se pudo obtener la contraseña desde el servidor:', e)
                }
            }
        }

        setShowPassword(prev => !prev)
    }

    const usuario_id = watch("usuario_id")
    const referencia_coordinador_id = watch("referencia_coordinador_id")

    // Cargar perfiles
    useEffect(() => {
        async function cargarPerfiles() {
            const { data } = await supabase.from("perfiles").select("*").eq("activo", true).order("nombre")
            if (data) setPerfiles(data)
        }
        cargarPerfiles()
    }, [])

    // Buscar personas (para el campo Coordinador/Usuario principal)
    useEffect(() => {
        if (personasSearch.length < 3) {
            setPersonas([])
            return
        }

        const timer = setTimeout(async () => {
            setLoadingPersonas(true)
            const results = await buscarReferentes(personasSearch)
            setPersonas(results)
            setLoadingPersonas(false)
        }, 300)

        return () => clearTimeout(timer)
    }, [personasSearch])

    // Buscar referencias (ahora busca en PERSONAS, no solo coordinadores)
    useEffect(() => {
        if (referenciaSearch.length < 3) {
            setReferencias([])
            return
        }

        const timer = setTimeout(async () => {
            setLoadingReferencias(true)
            // Usamos buscarReferentes que busca en la tabla personas
            const results = await buscarReferentes(referenciaSearch)
            setReferencias(results)
            setLoadingReferencias(false)
        }, 300)

        return () => clearTimeout(timer)
    }, [referenciaSearch])

    // Cargar datos iniciales de referencia si existen (para edición)
    useEffect(() => {
        async function cargarReferenciaInicial() {
            if (initialData?.referencia_coordinador_id && referencias.length === 0) {
                // Si es edición y hay referencia, intentar cargar sus datos básicos para mostrar en el combo
                if (initialData.referencia_nombre) {
                    setReferencias([{
                        id: initialData.referencia_coordinador_id,
                        nombres: (initialData.referencia_nombre || '').split(' ')[0] || '',
                        apellidos: (initialData.referencia_nombre || '').split(' ').slice(1).join(' ') || '',
                        numero_documento: ''
                    }])
                    return
                }

                // Si no tenemos referencia_nombre, consultar la API del coordinador y usar los datos del usuario asociado
                try {
                    const refId = initialData.referencia_coordinador_id
                    const res = await fetch(`/api/coordinador/${refId}`)
                    if (res.ok) {
                        const data = await res.json()
                        const nombre = data.nombres || data.referencia_nombre || ''
                        const partes = (nombre || '').split(' ')
                        const nombres = partes[0] || ''
                        const apellidos = partes.slice(1).join(' ') || ''
                        setReferencias([{ id: refId, nombres, apellidos, numero_documento: data.numero_documento || '' }])
                        return
                    }
                } catch (e) {
                    console.warn('No se pudo cargar referencia inicial desde API:', e)
                }
            }
        }
        cargarReferenciaInicial()
    }, [initialData])

    async function onSubmit(data: CoordinadorFormValues) {
        try {
            setSubmitting(true)

            if (isEditing && initialData?.coordinador_id) {
                const updatePayload: any = {
                    perfil_id: data.perfil_id,
                    referencia_coordinador_id: data.referencia_coordinador_id,
                    tipo: data.tipo,
                }

                if (data.password && data.password.trim() !== '') {
                    // Verificar permiso antes de permitir cambio de contraseña
                    if (!permisos?.administrar) {
                        setError('password', { type: 'manual', message: 'No tienes permisos para cambiar la contraseña' })
                        setSubmitting(false)
                        return
                    }
                    updatePayload.password = data.password
                }

                const result: any = await actualizar(initialData.coordinador_id, updatePayload)
                toast.success("Coordinador actualizado exitosamente")
                // Mostrar detalles si la API reportó acciones en Auth
                if (result?._auth_action) {
                    const a = result._auth_action as { action: string; auth_user_id?: string }
                    if (a.action === 'created') {
                        toast.success('Se creó un usuario de autenticación y se vinculó al coordinador')
                        setAuthUserId(a.auth_user_id || null)
                    } else if (a.action === 'linked') {
                        toast.success('Se vinculó el coordinador con un usuario de Auth existente')
                        setAuthUserId(a.auth_user_id || null)
                    } else if (a.action === 'updated') {
                        toast.success('Se actualizó la contraseña en Auth')
                    }
                }

                router.push("/dashboard/coordinador")
            } else {
                // IMPORTANTE: referencia_coordinador_id debe ser un ID de coordinador existente
                // Si no se proporciona, debe ser undefined/null, NO usar usuario_id
                const payload = {
                    ...data,
                    // La contraseña es requerida en creación según el esquema
                    password: data.password as string,
                    // Solo incluir referencia_coordinador_id si se proporcionó explícitamente
                    referencia_coordinador_id: data.referencia_coordinador_id || undefined
                }
                await crear(payload)
                toast.success("Coordinador creado exitosamente")
                router.push("/dashboard/coordinador")
            }

        } catch (error) {
            console.error("Error guardando coordinador:", error)
            const message = error instanceof Error ? error.message : "Error al guardar coordinador"
            // Si es un error de email duplicado, mostrarlo en el campo y evitar el mensaje en inglés
            if (message.includes('El email ya está registrado') || message.toLowerCase().includes('already')) {
                setError('email', { type: 'manual', message: 'El email ya está registrado' })
                toast.error('El email ya está registrado')
            } else {
                toast.error(message)
            }
        } finally {
            setSubmitting(false)
        }
    }

    const personaSeleccionada = personas.find(p => p.id === usuario_id)

    const personaDisplayName = (() => {
        if (!usuario_id) return 'Buscar persona...'
        const p = personaSeleccionada
        if (p) return `${p.nombres || ''} ${p.apellidos || ''}`.trim() || 'Persona seleccionada'
        const n = initialData?.nombres || ''
        const a = initialData?.apellidos || ''
        const full = `${n} ${a}`.trim()
        return full || 'Persona seleccionada'
    })()

    // Para referencia, necesitamos buscar en la lista de coordinadores cargados
    // Pero como cambiamos a buscar en personas, esto es complejo.
    // Voy a usar un estado separado para el nombre de la referencia seleccionada
    const [referenciaSeleccionadaNombre, setReferenciaSeleccionadaNombre] = useState("")

    async function handleCreateAuth() {
        if (!initialData?.coordinador_id) return
        setCreatingAuthUser(true)
        try {
            const res = await fetch(`/api/coordinador/${initialData.coordinador_id}/create-auth`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Error creando usuario en Auth')
            } else {
                toast.success('Usuario de Auth creado/vinculado correctamente')
                setAuthUserId(data?.auth_user_id || data?.id || null)
            }
        } catch (e) {
            console.error('Error creando usuario en Auth:', e)
            toast.error('Error creando usuario en Auth')
        } finally {
            setCreatingAuthUser(false)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Card className="border-none shadow-none">
                <CardHeader className="px-0 pt-0">
                    <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-2xl text-primary">Coordinador</CardTitle>
                        <UserCheck className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <CardDescription>
                        Seleccione el nombre de la lista de coordinadores, si desea agregar un coordinador nuevo a la lista debe agregarlo primero a la base de datos de Personas
                    </CardDescription>
                    {initialData?.incomplete && (
                        <div className="mt-4 p-3 rounded border border-yellow-200 bg-yellow-50 text-yellow-900 text-sm">
                            Este registro parece estar incompleto: el usuario asociado no fue encontrado en la tabla <code>usuarios</code>. Puede completar la información manualmente o asociar un usuario válido.
                        </div>
                    )}
                    {initialData?.coordinador_id && (
                        <div className="mt-3 text-sm text-muted-foreground">
                            {authUserId ? (
                                <div>Usuario de Auth vinculado: <span className="font-medium">{authUserId}</span></div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div>No hay usuario de Auth vinculado.</div>
                                    {permisos?.administrar && (
                                        <Button size="sm" variant="outline" onClick={handleCreateAuth} disabled={creatingAuthUser}>
                                            {creatingAuthUser ? 'Creando...' : 'Crear usuario en Auth'}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </CardHeader>
                <CardContent className="px-0 space-y-8">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* COLUMNA IZQUIERDA */}
                        <div className="space-y-6">
                            {/* Persona a Registrar (Antes Referencia) */}
                            <div className="space-y-2">
                                <Label className="text-muted-foreground font-normal">Referencia</Label>
                                <Popover open={openPersona} onOpenChange={setOpenPersona}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openPersona}
                                            className="w-full justify-between border-x-0 border-t-0 border-b rounded-none px-0 hover:bg-transparent shadow-none"
                                        >
                                            <span className={cn("text-base", !usuario_id && "text-muted-foreground")}>
                                                {personaDisplayName}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command shouldFilter={false}>
                                            <CommandInput
                                                placeholder="Buscar por nombre o cédula..."
                                                value={personasSearch}
                                                onValueChange={setPersonasSearch}
                                            />
                                            <CommandEmpty>
                                                {loadingPersonas ? "Buscando..." : "No se encontraron personas"}
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {personas.map((persona) => (
                                                    <CommandItem
                                                        key={persona.id}
                                                        value={`${persona.nombres} ${persona.apellidos} ${persona.numero_documento}`}
                                                        onSelect={() => {
                                                            setValue("usuario_id", persona.id)
                                                            setOpenPersona(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                usuario_id === persona.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {persona.nombres} {persona.apellidos}
                                                        <span className="ml-2 text-xs text-muted-foreground">
                                                            {persona.numero_documento}
                                                        </span>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {errors.usuario_id && (
                                    <p className="text-sm text-destructive">{errors.usuario_id.message}</p>
                                )}
                            </div>

                            {/* Usuario (Email) */}
                            <div className="space-y-2 pt-4">
                                <div className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    <Label htmlFor="email" className="text-muted-foreground font-normal">Usuario</Label>
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="correo@ejemplo.com"
                                    disabled={isEditing}
                                    {...register("email")}
                                    className="border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 shadow-none"
                                />
                                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                            </div>

                            {/* Rol de Usuario */}
                            <div className="space-y-2 pt-4">
                                <Label htmlFor="perfil_id" className="text-muted-foreground font-normal text-xs">Rol de usuario</Label>
                                <Select
                                    onValueChange={(value) => setValue("perfil_id", value === "none" ? "" : value)}
                                    defaultValue={initialData?.perfil_id || "none"}
                                >
                                    <SelectTrigger className="w-full border-none px-0 shadow-none focus:ring-0 font-medium">
                                        <SelectValue placeholder="Seleccione un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sin rol asignado</SelectItem>
                                        {perfiles.map((perfil) => (
                                            <SelectItem key={perfil.id} value={perfil.id}>
                                                {perfil.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA */}
                        <div className="space-y-6">
                            {/* Coordinador (Tipo) */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Tag className="h-5 w-5" />
                                    <Label className="text-muted-foreground font-normal">Coordinador</Label>
                                </div>
                                <Select
                                    onValueChange={(value: "Coordinador" | "Estructurador") => setValue("tipo", value)}
                                    defaultValue={initialData?.tipo || "Coordinador"}
                                >
                                    <SelectTrigger className="w-full border-x-0 border-t-0 border-b rounded-none px-0 shadow-none focus:ring-0">
                                        <SelectValue placeholder="Seleccione tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Coordinador">Coordinador</SelectItem>
                                        <SelectItem value="Estructurador">Estructurador</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.tipo && <p className="text-sm text-destructive">{errors.tipo.message}</p>}
                            </div>

                            {/* Contraseña */}
                            <div className="space-y-2 pt-4">
                                <div className="flex items-center gap-2">
                                    <Key className="h-5 w-5" />
                                    <Label htmlFor="password" className="text-muted-foreground font-normal">Contraseña</Label>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder={isEditing ? "Dejar en blanco para mantener actual" : ""}
                                        {...register("password")}
                                        className="border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 shadow-none pr-10"
                                    />
                                    <button type="button" onClick={handleToggleShowPassword} aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                                {/* Se permite ver y cambiar la contraseña desde el frontend */}
                            </div>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex justify-end gap-3 pt-6">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => router.push("/dashboard/coordinador")}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            CANCELAR <X className="w-4 h-4 ml-1" />
                        </Button>
                        <Button type="submit" disabled={submitting || loading} className="bg-[#0F4C81] hover:bg-[#0F4C81]/90 text-white">
                            {submitting || loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    GUARDANDO...
                                </>
                            ) : (
                                <>
                                    GUARDAR <Check className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    )
}
