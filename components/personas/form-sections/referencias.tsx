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
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="referencia_seleccion"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Referencia (Nombre o Sigla)</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: CALB" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="telefono_referencia"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Teléfono de Referencia</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: 3001234567" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}
