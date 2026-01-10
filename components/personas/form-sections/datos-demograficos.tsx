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
import { Checkbox } from "@/components/ui/checkbox"
import { UseFormReturn } from "react-hook-form"

interface DatosDemograficosSectionProps {
    form: UseFormReturn<any>
}

export function DatosDemograficosSection({ form }: DatosDemograficosSectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="nivel_escolaridad"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nivel Educativo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione nivel" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Primaria">Primaria</SelectItem>
                                <SelectItem value="Bachillerato">Bachillerato</SelectItem>
                                <SelectItem value="Técnico">Técnico</SelectItem>
                                <SelectItem value="Tecnólogo">Tecnólogo</SelectItem>
                                <SelectItem value="Profesional">Profesional</SelectItem>
                                <SelectItem value="Especialización">Especialización</SelectItem>
                                <SelectItem value="Maestría">Maestría</SelectItem>
                                <SelectItem value="Doctorado">Doctorado</SelectItem>
                                <SelectItem value="Ninguno">Ninguno</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="perfil_ocupacion"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Ocupación</FormLabel>
                        <FormControl>
                            <Input 
                                placeholder="Ej: Ingeniero, Estudiante..." 
                                {...field} 
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="tipo_vivienda"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo de Vivienda</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione tipo" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Propia">Propia</SelectItem>
                                <SelectItem value="Arrendada">Arrendada</SelectItem>
                                <SelectItem value="Familiar">Familiar</SelectItem>
                                <SelectItem value="Otra">Otra</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="estrato"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Estrato</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione estrato" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="1">Estrato 1</SelectItem>
                                <SelectItem value="2">Estrato 2</SelectItem>
                                <SelectItem value="3">Estrato 3</SelectItem>
                                <SelectItem value="4">Estrato 4</SelectItem>
                                <SelectItem value="5">Estrato 5</SelectItem>
                                <SelectItem value="6">Estrato 6</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

           

            <div className="flex flex-col gap-4">
                <FormField
                    control={form.control}
                    name="tiene_hijos"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>¿Tiene hijos?</FormLabel>
                            </div>
                        </FormItem>
                    )}
                />

                {form.watch("tiene_hijos") && (
                    <FormField
                        control={form.control}
                        name="numero_hijos"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Número de Hijos</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="number" 
                                        min="0" 
                                        placeholder="0"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>
        </div>
    )
}
