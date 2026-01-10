"use client"

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { UseFormReturn } from "react-hook-form"

interface ContactoSectionProps {
    form: UseFormReturn<any>
}

export function ContactoSection({ form }: ContactoSectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="ejemplo@correo.com" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="celular"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Celular</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: 3001234567" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="telefono_fijo"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Teléfono Fijo</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: 6011234567" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>WhatsApp</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: 3001234567" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}
