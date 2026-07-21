"use client"

import {
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
import { UseFormReturn } from "react-hook-form"
import { useCatalogos } from "@/lib/hooks/use-catalogos"
import { useEffect } from "react"

interface UbicacionSectionProps {
    form: UseFormReturn<any>
}

export function UbicacionSection({ form }: UbicacionSectionProps) {
    const {
        ciudades,
        zonas,
        puestosVotacion,
        loading,
        getLocalidadesPorCiudad,
        getBarriosPorLocalidad,
        fetchPuestosVotacion,
    } = useCatalogos()

    // Observar cambios para cargar dependencias
    const ciudadId = form.watch("ciudad_id")
    const localidadId = form.watch("localidad_id")
    const zonaId = form.watch("zona_id")

    // Antes se mostraban TODAS las localidades/barrios del catálogo sin
    // filtrar por ciudad/localidad seleccionada — por eso se veían opciones
    // que parecían repetidas o de otra ciudad. Ahora sí se filtra por el
    // padre elegido, y además el catálogo ya viene deduplicado por nombre
    // desde useCatalogos.
    const localidades = ciudadId ? getLocalidadesPorCiudad(ciudadId) : []
    const barrios = localidadId ? getBarriosPorLocalidad(localidadId) : []

    useEffect(() => {
        if (ciudadId) {
            fetchPuestosVotacion(ciudadId)
        }
    }, [ciudadId])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="lugar_nacimiento"
                render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Lugar de Nacimiento</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Barranquilla" autoComplete="off" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="direccion"
                render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Dirección de Residencia</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Cra 45 # 123 - 45" autoComplete="off" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="ciudad_id"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione ciudad" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {ciudades.map((ciudad) => (
                                    <SelectItem key={ciudad.id} value={ciudad.id}>
                                        {ciudad.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="md:col-span-2 flex items-center space-x-2">
                <FormControl>
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={form.watch("ubicacion_manual") || false}
                        onChange={(e) => {
                            form.setValue("ubicacion_manual", e.target.checked)
                            if (!e.target.checked) {
                                form.setValue("localidad_nombre", "")
                                form.setValue("barrio_nombre", "")
                            } else {
                                form.setValue("localidad_id", null)
                                form.setValue("barrio_id", null)
                            }
                        }}
                    />
                </FormControl>
                <FormLabel className="font-normal">
                    No encuentro mi ubicación en las listas (Ingresar manualmente)
                </FormLabel>
            </div>

            {form.watch("ubicacion_manual") ? (
                <>
                    <FormField
                        control={form.control}
                        name="localidad_nombre"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre Localidad </FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: soledad" autoComplete="off" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="barrio_nombre"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre Barrio</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: Santa Bárbara" autoComplete="off" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            ) : (
                <>
                    <FormField
                        control={form.control}
                        name="localidad_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Localidad / Comuna</FormLabel>
                                <Select
                                    onValueChange={(value) => {
                                        field.onChange(value)
                                        // Guardar también el nombre para búsquedas
                                        const selected = localidades.find(l => l.id === value)
                                        if (selected) {
                                            form.setValue("localidad_nombre", selected.nombre)
                                        }
                                    }}
                                    value={field.value || ""}
                                    disabled={!ciudadId}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione localidad" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {localidades.map((localidad) => (
                                            <SelectItem key={localidad.id} value={localidad.id}>
                                                {localidad.nombre}
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
                                <Select
                                    onValueChange={(value) => {
                                        field.onChange(value)
                                        // Guardar también el nombre para búsquedas
                                        const selected = barrios.find(b => b.id === value)
                                        if (selected) {
                                            form.setValue("barrio_nombre", selected.nombre)
                                        }
                                    }}
                                    value={field.value || ""}
                                    disabled={!localidadId}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione barrio" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {barrios.map((barrio) => (
                                            <SelectItem key={barrio.id} value={barrio.id}>
                                                {barrio.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            )}

            <FormField
                control={form.control}
                name="ubicacion"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Ubicación (Código FRV etc)</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: FRV" autoComplete="off" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}
