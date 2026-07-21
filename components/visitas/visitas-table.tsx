"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { MapaSeleccionUbicacion } from "./mapa-seleccion-ubicacion"

interface Militante {
    id: string
    usuario_id: string
    coordinador_id: string
    nombres: string
    apellidos: string
    numero_documento: string
    celular: string
    email: string
    visita_tipo: string | null
    visita_estado: string | null
    visita_created_at: string | null
}

interface Actividad {
    id: string
    nombre: string
    estado: string
}

const TIPOS_FALLBACK = ["REUNION COORDINACION", "REUNION PEDAGÓGICA", "REUNION POLÍTICA", "VISITA"]

export function VisitasTable() {
    const [loading, setLoading] = useState(true)
    const [militantes, setMilitantes] = useState<Militante[]>([])
    const [actividades, setActividades] = useState<Actividad[]>([])
    const [busqueda, setBusqueda] = useState("")

    const [modalAbierto, setModalAbierto] = useState(false)
    const [seleccionado, setSeleccionado] = useState<Militante | null>(null)
    const [tipoReunion, setTipoReunion] = useState("")
    const [observaciones, setObservaciones] = useState("")
    const [guardando, setGuardando] = useState(false)

    const [capturandoUbicacion, setCapturandoUbicacion] = useState(false)
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
    const [mapaAbierto, setMapaAbierto] = useState(false)

    const opcionesTipo = actividades.length > 0 ? actividades.map((a) => a.nombre) : TIPOS_FALLBACK

    useEffect(() => {
        cargarDatos()
    }, [])

    async function cargarDatos() {
        setLoading(true)
        try {
            const res = await fetch("/api/visitas")
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error cargando militantes")

            setMilitantes(data.militantes || [])
            setActividades(data.actividades || [])
        } catch (error: any) {
            console.error("Error cargando visitas:", error)
            toast.error(error.message || "No se pudieron cargar los militantes")
        } finally {
            setLoading(false)
        }
    }

    const filtrados = useMemo(() => {
        if (!busqueda.trim()) return militantes
        const q = busqueda.toLowerCase()
        return militantes.filter((m) => {
            const nombre = `${m.nombres} ${m.apellidos}`.toLowerCase()
            return nombre.includes(q) || (m.numero_documento || "").toLowerCase().includes(q)
        })
    }, [militantes, busqueda])

    function abrirModal(militante: Militante) {
        setSeleccionado(militante)
        setTipoReunion(opcionesTipo[0] || "VISITA")
        setObservaciones("")
        setCoords(null)
        setModalAbierto(true)
    }

    function handleGeolocalizar() {
        if (!navigator.geolocation) {
            toast.error("Tu navegador no soporta geolocalización")
            return
        }

        setCapturandoUbicacion(true)
        navigator.geolocation.getCurrentPosition(
            (posicion) => {
                setCapturandoUbicacion(false)
                setCoords({ lat: posicion.coords.latitude, lng: posicion.coords.longitude })
                setMapaAbierto(true)
            },
            (error) => {
                setCapturandoUbicacion(false)
                toast.error(`No se pudo obtener la ubicación: ${error.message}`)
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        )
    }

    async function handleRegistrarVisita() {
        if (!seleccionado) return

        setGuardando(true)
        try {
            const res = await fetch("/api/visitas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_militante: seleccionado.id,
                    tipo_reunion: tipoReunion,
                    observaciones: observaciones.trim() || undefined,
                    latitud: coords?.lat,
                    longitud: coords?.lng,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "No se pudo registrar la visita")

            toast.success("Visita registrada correctamente")
            setModalAbierto(false)
            await cargarDatos()
        } catch (error: any) {
            console.error("Error registrando visita:", error)
            toast.error(error.message || "Error registrando la visita")
        } finally {
            setGuardando(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Cargando militantes...
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div>
                <p className="text-sm text-muted-foreground">
                    Mostrando {filtrados.length} de {militantes.length} militante{militantes.length === 1 ? "" : "s"}
                </p>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nombre o documento"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-9"
                />
            </div>

            {filtrados.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground border rounded-lg">
                    No hay militantes asignados
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtrados.map((m) => {
                        const pendiente = m.visita_estado === "En espera"
                        return (
                            <div key={m.id} className="rounded-lg border bg-card p-4 shadow-sm">
                                <p className="font-semibold text-foreground">{m.nombres} {m.apellidos}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{m.numero_documento}</p>
                                <p className="text-xs text-muted-foreground">{m.celular}</p>

                                {m.visita_tipo && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs font-medium bg-primary/10 text-primary rounded px-2 py-0.5">
                                            {m.visita_tipo}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{m.visita_estado}</span>
                                    </div>
                                )}

                                <Button
                                    size="sm"
                                    className="w-full mt-3 bg-primary text-primary-foreground hover:bg-primary/90"
                                    disabled={pendiente}
                                    variant={pendiente ? "secondary" : "default"}
                                    onClick={() => abrirModal(m)}
                                >
                                    {pendiente ? "Visita Pendiente" : "Registrar Visita"}
                                </Button>
                            </div>
                        )
                    })}
                </div>
            )}

            <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Registro de Visita</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Militante</p>
                            <p className="font-medium">{seleccionado ? `${seleccionado.nombres} ${seleccionado.apellidos}` : ""}</p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Tipo de reunión</label>
                            <Select value={tipoReunion} onValueChange={setTipoReunion}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecciona un tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {opcionesTipo.map((t) => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Observaciones</label>
                            <Textarea
                                placeholder="Escribe observaciones de la visita..."
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={handleGeolocalizar}
                            disabled={capturandoUbicacion}
                        >
                            {capturandoUbicacion ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <MapPin className="w-4 h-4 mr-2" />
                            )}
                            Geolocalización
                        </Button>

                        {coords && (
                            <button
                                type="button"
                                onClick={() => setMapaAbierto(true)}
                                className="text-xs text-primary text-center w-full underline underline-offset-2"
                            >
                                Ubicación capturada: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} (ver mapa)
                            </button>
                        )}

                        <div className="flex gap-2 pt-2">
                            <Button
                                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={handleRegistrarVisita}
                                disabled={guardando}
                            >
                                {guardando ? "Guardando..." : "Registrar"}
                            </Button>
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setModalAbierto(false)}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={mapaAbierto} onOpenChange={setMapaAbierto}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" /> Geolocalización
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-xs text-muted-foreground -mt-2">
                        Arrastra el ícono rojo o haz clic en el mapa para ajustar la ubicación
                    </p>
                    {coords && (
                        <MapaSeleccionUbicacion
                            lat={coords.lat}
                            lng={coords.lng}
                            onChange={(lat, lng) => setCoords({ lat, lng })}
                        />
                    )}
                    <Button
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => setMapaAbierto(false)}
                    >
                        Entendido ✔
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    )
}
