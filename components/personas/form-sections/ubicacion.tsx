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
        localidades,
        barrios,
        zonas,
        puestosVotacion,
        loading,
        fetchLocalidades,
        fetchBarrios,
        fetchPuestosVotacion,
    } = useCatalogos()

    // Observar cambios para cargar dependencias
    const ciudadId = form.watch("ciudad_id")
    const localidadId = form.watch("localidad_id")
    const zonaId = form.watch("zona_id")

    useEffect(() => {
        if (ciudadId) {
            fetchLocalidades(ciudadId)
            fetchPuestosVotacion(ciudadId)
        }
    }, [ciudadId])

    useEffect(() => {
        if (localidadId) {
            fetchBarrios(localidadId)
        }
    }, [localidadId])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="direccion"
                render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Dirección de Residencia</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Cra 45 # 123 - 45" {...field} />
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
                                    <Input placeholder="Ej: soledad" {...field} />
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
                                    <Input placeholder="Ej: Santa Bárbara" {...field} />
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
                name="zona_id"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Zona</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione zona" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {zonas.map((zona) => (
                                    <SelectItem key={zona.id} value={zona.id}>
                                        {zona.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}
