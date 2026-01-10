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
import { useEffect, useState } from 'react'

interface DatosPersonalesSectionProps {
    form: UseFormReturn<any>
}

export function DatosPersonalesSection({ form }: DatosPersonalesSectionProps) {
    const [grupos, setGrupos] = useState<any[]>([])

    useEffect(() => {
        let mounted = true
        fetch('/api/grupo-etnico')
            .then(r => r.json())
            .then(d => { if (mounted) setGrupos(d || []) })
            .catch(() => { if (mounted) setGrupos([]) })
        return () => { mounted = false }
    }, [])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="nombres"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombres *</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Juan Carlos" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="apellidos"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Apellidos *</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Pérez Rodríguez" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="tipo_documento"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo de Documento *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione tipo" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Cédula">Cédula de Ciudadanía</SelectItem>
                                <SelectItem value="Tarjeta de Identidad">Tarjeta de Identidad</SelectItem>
                                <SelectItem value="Cédula de Extranjería">Cédula de Extranjería</SelectItem>
                                <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                                <SelectItem value="Registro Civil">Registro Civil</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="numero_documento"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Número de Documento *</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: 1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="fecha_nacimiento"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fecha de Nacimiento</FormLabel>
                        <FormControl>
                            <Input 
                                type="date" 
                                value={field.value || ""} 
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "activo"}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione estado" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="activo">Activo</SelectItem>
                                <SelectItem value="inactivo">Inactivo</SelectItem>
                                <SelectItem value="suspendido">Suspendido</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="genero"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Género</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione género" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Masculino">Masculino</SelectItem>
                                <SelectItem value="Femenino">Femenino</SelectItem>
                                <SelectItem value="Otro">Otro</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="estado_civil"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Estado Civil</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione estado" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Soltero">Soltero/a</SelectItem>
                                <SelectItem value="Casado">Casado/a</SelectItem>
                                <SelectItem value="Unión Libre">Unión Libre</SelectItem>
                                <SelectItem value="Divorciado">Divorciado/a</SelectItem>
                                <SelectItem value="Viudo">Viudo/a</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="grupo_etnico"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Grupo Étnico</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione grupo étnico" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {grupos.map(g => (
                                    <SelectItem key={g.id} value={String(g.id)}>{g.nombre}</SelectItem>
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
