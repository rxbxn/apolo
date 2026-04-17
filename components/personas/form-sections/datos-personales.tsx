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


    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="nombres"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombres *</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Juan Carlos" {...field} value={field.value ?? ""} />
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
                            <Input placeholder="Ej: Pérez Rodríguez" {...field} value={field.value ?? ""} />
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
                            <Input placeholder="Ej: 1234567890" {...field} value={field.value ?? ""} />
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
                name="fecha_registro"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fecha de Registro</FormLabel>
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
                                <SelectItem value="Activo">Activo</SelectItem>
                                <SelectItem value="activo">activo (sistema)</SelectItem>
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
                name="poblacion"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Población</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Afrocolombiano, Indígena..." {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Verificación de Sticker */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md bg-muted/20">
                <div className="md:col-span-2">
                    <h4 className="text-sm font-semibold mb-2">Verificación de Sticker</h4>
                </div>
                <FormField
                    control={form.control}
                    name="verificacion_sticker"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Verificación Sticker</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="SI">SI</SelectItem>
                                    <SelectItem value="NO">NO</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="fecha_verificacion_sticker"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fecha Verificación Sticker</FormLabel>
                            <FormControl>
                                <Input 
                                    type="datetime-local" 
                                    value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""} 
                                    onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                                    onBlur={field.onBlur}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="nombre_verificador"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Verificador</FormLabel>
                            <FormControl>
                                <Input placeholder="Nombre de quien verifica" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="observacion_verificacion_sticker"
                    render={({ field }) => (
                        <FormItem className="md:col-span-2">
                            <FormLabel>Observación Verificación</FormLabel>
                            <FormControl>
                                <Input placeholder="Observaciones..." {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    )
}
