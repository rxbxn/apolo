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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { UseFormReturn } from "react-hook-form"
import { useCatalogos } from "@/lib/hooks/use-catalogos"
import { usePersonas } from "@/lib/hooks/use-personas"
import { useState, useEffect } from "react"

interface ReferenciasSectionProps {
    form: UseFormReturn<any>
}

export function ReferenciasSection({ form }: ReferenciasSectionProps) {
    const { tiposReferencia } = useCatalogos()
    const { buscarReferentes } = usePersonas()
    const [referencias, setReferencias] = useState<any[]>([])
    const [loadingReferencias, setLoadingReferencias] = useState(false)
    // Cargar referencias desde la tabla referencia
    useEffect(() => {
        let mounted = true
        setLoadingReferencias(true)
        fetch('/api/referencia')
            .then(r => r.json())
            .then(d => { if (mounted) setReferencias(d || []) })
            .catch(() => { /* ignore */ })
            .finally(() => { if (mounted) setLoadingReferencias(false) })
        return () => { mounted = false }
    }, [])
    const [open, setOpen] = useState(false)
    const [referentes, setReferentes] = useState<any[]>([])
    const [loadingReferentes, setLoadingReferentes] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Simple debounce effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length >= 3) {
                setLoadingReferentes(true)
                const results = await buscarReferentes(searchTerm)
                setReferentes(results)
                setLoadingReferentes(false)
            } else {
                setReferentes([])
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [searchTerm])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="referencia_id"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Referencia</FormLabel>
                        <FormControl>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione referencia" />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingReferencias ? (
                                        <div className="p-3 text-sm text-muted-foreground">Cargando...</div>
                                    ) : referencias.length === 0 ? (
                                        <div className="p-3 text-sm text-muted-foreground">No hay referencias</div>
                                    ) : (
                                        referencias.map(r => (
                                            <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="tipo_referencia_id"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo de Referencia</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione tipo" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {tiposReferencia.map((tipo) => (
                                    <SelectItem key={tipo.id} value={tipo.id}>
                                        {tipo.nombre}
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
