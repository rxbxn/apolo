"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Command,
    CommandInput,
    CommandItem,
    CommandEmpty,
    CommandGroup,
} from "@/components/ui/command"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { ChevronsUpDown, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { usePermisos } from "@/lib/hooks/use-permisos"
import { useCoordinadores } from "@/lib/hooks/use-coordinadores"

export function DirigenteForm() {
    const router = useRouter()
    const { permisos } = usePermisos("Módulo Dirigente")
    const [submitting, setSubmitting] = useState(false)

    const { buscarCoordinadores, buscarDirigentes, buscarPorPerfil } = useCoordinadores()

    const [openDirigente, setOpenDirigente] = useState(false)
    const [dirigenteSearch, setDirigenteSearch] = useState("")
    const [dirigentes, setDirigentes] = useState<any[]>([])
    const [loadingDirigentes, setLoadingDirigentes] = useState(false)
    const [selectedDirigente, setSelectedDirigente] = useState<any>(null)

    const [openCoordinador, setOpenCoordinador] = useState(false)
    const [coordinadorSearch, setCoordinadorSearch] = useState("")
    const [coordinadores, setCoordinadores] = useState<any[]>([])
    const [loadingCoordinadores, setLoadingCoordinadores] = useState(false)
    const [selectedCoordinador, setSelectedCoordinador] = useState<any>(null)

    // Helper: get perfil id by name pattern
    async function getPerfilIdByName(pattern: string) {
        try {
            const res: any = await supabase.from('perfiles').select('id, nombre').ilike('nombre', pattern).limit(1)
            const data: any[] = res.data
            return data && data.length > 0 ? data[0].id : null
        } catch (e) {
            console.error('Error loading perfil:', e)
            return null
        }
    }

    // Fetch dirigentes (coordinadores con perfil 'Dirigente') once and allow client-side filtering
    useEffect(() => {
        let mounted = true
        async function load() {
            setLoadingDirigentes(true)
            try {
                const data = await buscarDirigentes()
                // Normalizar estructura: usar coordinador_id como id
                const items = (data || []).map((d: any) => ({
                    id: d.coordinador_id || d.id || d.coordinadorId,
                    nombre: `${d.nombres || ''} ${d.apellidos || ''}`.trim(),
                    numero_documento: d.numero_documento || '',
                }))

                if (mounted) setDirigentes(items)
            } catch (e) {
                console.error('Error cargando dirigentes:', e)
                if (mounted) setDirigentes([])
            } finally {
                if (mounted) setLoadingDirigentes(false)
            }
        }

        // Only load when the popover is about to be used to avoid extra requests
        if (openDirigente && dirigentes.length === 0) load()

        return () => { mounted = false }
    }, [openDirigente, buscarDirigentes])

    // Use buscarCoordinadores for searching coordinadores (requires mínimo 3 caracteres)
    useEffect(() => {
        let mounted = true
        if (!coordinadorSearch || coordinadorSearch.length < 1) {
            setCoordinadores([])
            return
        }

        const timer = setTimeout(async () => {
            setLoadingCoordinadores(true)
            try {
                // Prefer using buscarPorPerfil to ensure we only get coordinadores with perfil starting with 'Coordinador'
                const data = await buscarPorPerfil('Coordinador', coordinadorSearch)
                const items = (data || []).map((c: any) => ({
                    id: c.coordinador_id || c.id,
                    nombre: `${c.nombres || ''} ${c.apellidos || ''}`.trim() || c.email || 'Usuario desconocido',
                    numero_documento: c.numero_documento || '',
                    perfil: c.rol || 'Sin perfil'
                }))

                if (mounted) setCoordinadores(items)
            } catch (e) {
                console.error('Error buscando coordinadores por perfil:', e)
                if (mounted) setCoordinadores([])
            } finally {
                if (mounted) setLoadingCoordinadores(false)
            }
        }, 300)

        return () => { mounted = false; clearTimeout(timer) }
    }, [coordinadorSearch, buscarPorPerfil])

    async function handleSubmit(e: any) {
        e.preventDefault()

        console.log('Submitting form...', { permisos, selectedDirigente, selectedCoordinador })

        if (!permisos?.crear) {
            console.error('No permissions to create')
            toast.error('No tienes permisos para crear dirigentes')
            return
        }

        if (!selectedDirigente) {
            toast.error('Selecciona el dirigente')
            return
        }

        if (!selectedCoordinador) {
            toast.error('Selecciona el coordinador')
            return
        }

        setSubmitting(true)

        try {
            const res = await fetch('/api/dirigente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dirigente_id: selectedDirigente.id, coordinador_id: selectedCoordinador.id })
            })

            const data = await res.json()

            if (!res.ok) {
                const msg = data?.error || 'Error guardando dirigente'
                toast.error(msg)
                setSubmitting(false)
                return
            }

            toast.success('Dirigente creado correctamente')
            router.push('/dashboard/dirigente')
        } catch (err) {
            console.error(err)
            toast.error('Error al guardar dirigente')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-2xl text-primary">Crear Dirigente</CardTitle>
                    </div>
                    <CardDescription>Seleccione el dirigente y el coordinador relacionados (búsqueda por nombre).</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Dirigente select */}
                    <div>
                        <label className="text-sm text-muted-foreground mb-2 block">Dirigente</label>
                        <Popover open={openDirigente} onOpenChange={setOpenDirigente}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                    <span>{selectedDirigente ? selectedDirigente.nombre : 'Buscar dirigente...'}</span>
                                    <ChevronsUpDown className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0">
                                <Command>
                                    <CommandInput value={dirigenteSearch} onValueChange={setDirigenteSearch} placeholder="Buscar dirigente por nombre..." />
                                    <CommandEmpty>No se encontraron dirigentes</CommandEmpty>
                                    <CommandGroup>
                                        {loadingDirigentes ? (
                                            <div className="p-4 flex items-center justify-center"><Loader2 className="animate-spin" /></div>
                                        ) : (
                                            dirigentes
                                                .filter((it: any) => it.nombre.toLowerCase().includes(dirigenteSearch.toLowerCase()))
                                                .map((d) => (
                                                    <CommandItem key={d.id} onSelect={() => { setSelectedDirigente(d); setOpenDirigente(false) }}>
                                                        <div className="flex items-center justify-between w-full">
                                                            <div>{d.nombre}</div>
                                                            <div className="text-xs text-muted-foreground">{d.numero_documento}</div>
                                                        </div>
                                                    </CommandItem>
                                                ))
                                        )}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Coordinador select */}
                    <div>
                        <label className="text-sm text-muted-foreground mb-2 block">Coordinador</label>
                        <Popover open={openCoordinador} onOpenChange={setOpenCoordinador}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                    <span>{selectedCoordinador ? selectedCoordinador.nombre : 'Buscar coordinador...'}</span>
                                    <ChevronsUpDown className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0">
                                <Command>
                                    <CommandInput value={coordinadorSearch} onValueChange={setCoordinadorSearch} placeholder="Buscar coordinador por nombre..." />
                                    <CommandEmpty>No se encontraron coordinadores</CommandEmpty>
                                    <CommandGroup>
                                        {loadingCoordinadores ? (
                                            <div className="p-4 flex items-center justify-center"><Loader2 className="animate-spin" /></div>
                                        ) : (
                                            coordinadores.map((c) => (
                                                <CommandItem key={c.id} onSelect={() => { setSelectedCoordinador(c); setOpenCoordinador(false) }}>
                                                    <div className="flex items-center justify-between w-full">
                                                        <div>{c.nombre}</div>
                                                        <div className="text-xs text-muted-foreground">{c.perfil} - {c.numero_documento}</div>
                                                    </div>
                                                </CommandItem>
                                            ))
                                        )}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={submitting}>{submitting ? 'Creando...' : 'Crear Dirigente'}</Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    )
}
