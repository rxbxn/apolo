"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown, Eye, EyeOff, Loader2, UserPlus, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { aplicarBusquedaPorNombre } from "@/lib/supabase/busqueda"
import { cn } from "@/lib/utils"

interface Perfil {
    id: string
    nombre: string
}

interface PersonaBusqueda {
    id: string
    nombres: string
    apellidos: string
    numero_documento: string
}

interface UsuarioSistema {
    id: string
    nombres: string
    apellidos: string
    username: string
    password: string | null
    perfil_asignado: { nombre: string } | null
}

// Crea el acceso a la app para una persona que YA existe en Personas, pero
// sin necesidad de un correo real: solo un nombre de usuario + contraseña.
// Por debajo se le arma un correo interno sintético (username@apolo.interno)
// para que Supabase Auth pueda crear la cuenta — eso lo hace /api/roles.
export function CrearUsuarioManager() {
    const [perfiles, setPerfiles] = useState<Perfil[]>([])
    const [loadingPerfiles, setLoadingPerfiles] = useState(true)

    // Combobox de persona
    const [openPersona, setOpenPersona] = useState(false)
    const [personasSearch, setPersonasSearch] = useState("")
    const [personas, setPersonas] = useState<PersonaBusqueda[]>([])
    const [loadingPersonas, setLoadingPersonas] = useState(false)
    const [personaId, setPersonaId] = useState("")
    const [personaSeleccionada, setPersonaSeleccionada] = useState<PersonaBusqueda | null>(null)

    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [perfilId, setPerfilId] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
    const [loadingLista, setLoadingLista] = useState(true)
    const [passwordVisible, setPasswordVisible] = useState<Record<string, boolean>>({})

    const cargarPerfiles = useCallback(async () => {
        try {
            const { data } = await supabase.from("perfiles").select("id, nombre").eq("activo", true).order("nombre")
            setPerfiles(data || [])
        } finally {
            setLoadingPerfiles(false)
        }
    }, [])

    const cargarLista = useCallback(async () => {
        setLoadingLista(true)
        try {
            const res = await fetch("/api/roles?pageSize=500")
            const data = await res.json()
            const conUsername = ((data.usuarios || []) as any[]).filter((u) => u.username)
            setUsuarios(conUsername)
        } catch (err) {
            console.error("Error cargando usuarios con acceso por username:", err)
        } finally {
            setLoadingLista(false)
        }
    }, [])

    useEffect(() => {
        cargarPerfiles()
        cargarLista()
    }, [cargarPerfiles, cargarLista])

    // Buscar personas — igual criterio que coordinador-form: lista inicial
    // al abrir, y filtra a partir de 3 letras.
    useEffect(() => {
        if (!openPersona) return
        const timer = setTimeout(async () => {
            setLoadingPersonas(true)
            let query = supabase
                .from("usuarios")
                .select("id, nombres, apellidos, numero_documento")
                .order("nombres", { ascending: true })
                .limit(20)
            if (personasSearch.length >= 3) {
                query = aplicarBusquedaPorNombre(query, personasSearch)
            }
            const { data } = await query
            setPersonas(data || [])
            setLoadingPersonas(false)
        }, 300)
        return () => clearTimeout(timer)
    }, [personasSearch, openPersona])

    function resetForm() {
        setPersonaId("")
        setPersonaSeleccionada(null)
        setUsername("")
        setPassword("")
        setPerfilId("")
        setShowPassword(false)
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!personaId) {
            toast.error("Selecciona una persona de la lista")
            return
        }
        if (!username.trim()) {
            toast.error("Escribe un nombre de usuario")
            return
        }
        if (!password || password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres")
            return
        }
        if (!perfilId) {
            toast.error("Selecciona un rol")
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch("/api/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usuario_id: personaId,
                    perfil_id: perfilId,
                    username: username.trim(),
                    password,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error creando el usuario")

            toast.success(
                `Usuario "${username.trim().toLowerCase()}" creado para ${personaSeleccionada?.nombres ?? ""} ${personaSeleccionada?.apellidos ?? ""}. Ya puede iniciar sesión en la app con ese usuario y su contraseña.`,
                { duration: 8000 }
            )
            resetForm()
            cargarLista()
        } catch (err: any) {
            toast.error(err.message || "Error creando el usuario")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-8">
            <Card className="border-none shadow-none">
                <CardHeader className="px-0 pt-0">
                    <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl text-primary">Crear usuario sin correo</CardTitle>
                        <UserPlus className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardDescription>
                        Selecciona una persona ya registrada en Personas y dale acceso a la app con un nombre de
                        usuario y contraseña — no necesita un correo real. Útil para roles operativos como
                        Verificador de Sticker.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-muted-foreground font-normal">Persona</Label>
                            <Popover open={openPersona} onOpenChange={setOpenPersona}>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openPersona}
                                        className="w-full justify-between border-x-0 border-t-0 border-b rounded-none px-0 hover:bg-transparent shadow-none"
                                    >
                                        <span className={cn("text-base", !personaId && "text-muted-foreground")}>
                                            {personaSeleccionada
                                                ? `${personaSeleccionada.nombres} ${personaSeleccionada.apellidos}`
                                                : "Buscar persona..."}
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
                                                        setPersonaId(persona.id)
                                                        setPersonaSeleccionada(persona)
                                                        setOpenPersona(false)
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            personaId === persona.id ? "opacity-100" : "opacity-0"
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
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-muted-foreground font-normal">
                                Usuario (para iniciar sesión)
                            </Label>
                            <Input
                                id="username"
                                placeholder="ej: jperez"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 shadow-none"
                                autoCapitalize="off"
                                autoCorrect="off"
                            />
                            <p className="text-xs text-muted-foreground">
                                Solo letras, números, punto o guion — sin espacios ni @. No necesita correo real.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-muted-foreground font-normal">Rol</Label>
                            <Select value={perfilId} onValueChange={setPerfilId} disabled={loadingPerfiles}>
                                <SelectTrigger className="w-full border-x-0 border-t-0 border-b rounded-none px-0 shadow-none focus:ring-0">
                                    <SelectValue placeholder={loadingPerfiles ? "Cargando..." : "Selecciona un rol"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {perfiles.map((perfil) => (
                                        <SelectItem key={perfil.id} value={perfil.id}>
                                            {perfil.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {perfiles.length === 0 && !loadingPerfiles && (
                                <p className="text-xs text-muted-foreground">
                                    No hay roles creados todavía — crea uno primero en la pestaña "Crear Rol".
                                </p>
                            )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="password" className="text-muted-foreground font-normal">
                                Contraseña
                            </Label>
                            <div className="relative max-w-sm">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 shadow-none pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                            <Button type="submit" disabled={submitting} className="bg-[#0F4C81] hover:bg-[#0F4C81]/90 text-white">
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        CREANDO...
                                    </>
                                ) : (
                                    <>
                                        <KeyRound className="w-4 h-4 mr-2" />
                                        CREAR USUARIO
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <p className="text-sm font-medium">Usuarios con acceso por username</p>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Persona</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Contraseña</TableHead>
                                <TableHead>Rol</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingLista ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : usuarios.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                        Todavía no has creado ningún usuario por username
                                    </TableCell>
                                </TableRow>
                            ) : (
                                usuarios.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">
                                            {u.nombres} {u.apellidos}
                                        </TableCell>
                                        <TableCell>{u.username}</TableCell>
                                        <TableCell>
                                            {u.password ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm">
                                                        {passwordVisible[u.id] ? u.password : "••••••••"}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setPasswordVisible((prev) => ({ ...prev, [u.id]: !prev[u.id] }))
                                                        }
                                                        className="text-muted-foreground"
                                                        aria-label="Ver/ocultar contraseña"
                                                    >
                                                        {passwordVisible[u.id] ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {u.perfil_asignado ? (
                                                <Badge variant="outline">{u.perfil_asignado.nombre}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Sin rol</span>
                                            )}
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
