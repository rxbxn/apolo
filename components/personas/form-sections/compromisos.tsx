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
    const [options, setOptions] = useState<any[]>([])

    useEffect(() => {
        let mounted = true
        fetch('/api/compromiso')
            .then(r => r.json())
            .then(d => { if (mounted) setOptions(d || []) })
            .catch(() => { if (mounted) setOptions([]) })
        return () => { mounted = false }
    }, [])

    return (
        <div className="space-y-6">
            {/* Fila 1: Campos numéricos de compromisos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                    control={form.control}
                    name="compromiso_marketing"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Compromiso Marketing</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
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
                                <Input type="number" {...field} />
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
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <FormField
                    control={form.control}
                    name="compromiso_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Compromiso</FormLabel>
                            <FormControl>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione compromiso" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {options.map(o => (
                                            <SelectItem key={o.id} value={String(o.id)}>{o.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

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
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}
