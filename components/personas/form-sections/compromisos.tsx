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
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select"
import { useEffect, useState } from 'react'
import { getcompromiso } from '@/lib/actions/configuracion'
import { Textarea } from "@/components/ui/textarea"
import { UseFormReturn } from "react-hook-form"

interface CompromisosSectionProps {
    form: UseFormReturn<any>
}

export function CompromisosSection({ form }: CompromisosSectionProps) {


    return (
        <div className="space-y-6">
            {/* Fila 1: Campos numéricos de compromisos */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <FormField
                    control={form.control}
                    name="compromiso_marketing"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Compromiso Marketing</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="compromiso_cautivo"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Compromiso Cautivo</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="compromiso_impacto"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Compromiso Impacto</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

                <FormField
                    control={form.control}
                    name="compromiso_difusion"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Compromiso Difusión</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="compromiso_proyecto"
                    render={({ field }) => (
                        <FormItem className="md:col-span-1">
                            <FormLabel>Compromiso Proyecto (Gestión, etc)</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej: GESTION LABORAL" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

            {/* Fila 3: Observaciones */}
            <FormField
                control={form.control}
                name="observaciones"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Observaciones Generales</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="Ingrese cualquier observación relevante sobre la persona..."
                                className="min-h-[120px]"
                                {...field}
                                value={field.value ?? ""}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}
