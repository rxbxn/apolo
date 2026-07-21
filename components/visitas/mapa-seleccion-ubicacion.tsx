"use client"

import { useEffect, useRef } from "react"

interface MapaSeleccionUbicacionProps {
    lat: number
    lng: number
    onChange: (lat: number, lng: number) => void
}

// Carga Leaflet desde CDN (sin `npm install`, sin API key ni cuenta de
// Google) — la misma solución que ya usamos en la app móvil (WebView +
// Leaflet). Se cachea la promesa para no reinyectar el script si el
// componente se monta varias veces en la misma sesión de navegador.
let leafletPromise: Promise<any> | null = null

function cargarLeaflet(): Promise<any> {
    if (typeof window === "undefined") return Promise.reject(new Error("SSR"))
    if ((window as any).L) return Promise.resolve((window as any).L)
    if (leafletPromise) return leafletPromise

    leafletPromise = new Promise((resolve, reject) => {
        if (!document.querySelector('link[data-leaflet]')) {
            const link = document.createElement("link")
            link.rel = "stylesheet"
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            link.setAttribute("data-leaflet", "true")
            document.head.appendChild(link)
        }

        const script = document.createElement("script")
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        script.async = true
        script.onload = () => resolve((window as any).L)
        script.onerror = () => reject(new Error("No se pudo cargar Leaflet"))
        document.body.appendChild(script)
    })

    return leafletPromise
}

export function MapaSeleccionUbicacion({ lat, lng, onChange }: MapaSeleccionUbicacionProps) {
    const contenedorRef = useRef<HTMLDivElement>(null)
    const mapaRef = useRef<any>(null)
    const marcadorRef = useRef<any>(null)

    // Inicializa el mapa una sola vez.
    useEffect(() => {
        let cancelado = false

        cargarLeaflet().then((L) => {
            if (cancelado || !contenedorRef.current || mapaRef.current) return

            const mapa = L.map(contenedorRef.current).setView([lat, lng], 17)

            L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "&copy; OpenStreetMap contributors",
                maxZoom: 19,
            }).addTo(mapa)

            const iconoRojo = L.icon({
                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
            })

            const marcador = L.marker([lat, lng], { icon: iconoRojo, draggable: true }).addTo(mapa)

            marcador.on("dragend", () => {
                const pos = marcador.getLatLng()
                onChange(pos.lat, pos.lng)
            })

            mapa.on("click", (e: any) => {
                marcador.setLatLng(e.latlng)
                onChange(e.latlng.lat, e.latlng.lng)
            })

            mapaRef.current = mapa
            marcadorRef.current = marcador

            // Leaflet necesita recalcular el tamaño si el contenedor estaba
            // oculto (ej. dentro de un modal) al momento de crear el mapa.
            setTimeout(() => mapa.invalidateSize(), 150)
        })

        return () => {
            cancelado = true
            if (mapaRef.current) {
                mapaRef.current.remove()
                mapaRef.current = null
                marcadorRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Si lat/lng cambian externamente (ej. se volvió a capturar GPS),
    // recentrar el mapa y mover el marcador sin recrear todo.
    useEffect(() => {
        if (mapaRef.current && marcadorRef.current) {
            mapaRef.current.setView([lat, lng], 17)
            marcadorRef.current.setLatLng([lat, lng])
        }
    }, [lat, lng])

    return (
        <div
            ref={contenedorRef}
            className="w-full h-[280px] rounded-md overflow-hidden border"
        />
    )
}
