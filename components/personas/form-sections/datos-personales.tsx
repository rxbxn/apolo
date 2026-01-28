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
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload, Trash } from 'lucide-react'

interface DatosPersonalesSectionProps {
    form: UseFormReturn<any>
}

export function DatosPersonalesSection({ form }: DatosPersonalesSectionProps) {
    const [grupos, setGrupos] = useState<any[]>([])
    const [uploading, setUploading] = useState(false)
    const fotoUrl = form.watch('foto_perfil_url')

    useEffect(() => {
        let mounted = true
        fetch('/api/grupo-etnico')
            .then(r => r.json())
            .then(d => { if (mounted) setGrupos(d || []) })
            .catch(() => { if (mounted) setGrupos([]) })
        return () => { mounted = false }
    }, [])

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            setUploading(true)
            const fileExt = file.name.split('.').pop()
            const fileName = `usuarios/${Date.now()}.${fileExt}`
            const { data, error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })
            if (error) throw error
            const publicUrl = supabase.storage.from('avatars').getPublicUrl(data.path).data.publicUrl
            form.setValue('foto_perfil_url', publicUrl)
        } catch (err) {
            console.error('Error subiendo imagen:', err)
            alert('Error subiendo imagen')
        } finally {
            setUploading(false)
            // reset input value to allow uploading the same file again if needed
            const input = document.getElementById('foto-upload') as HTMLInputElement | null
            if (input) input.value = ''
        }
    }

    async function handleRemoveImage() {
        // Only remove url from form; do not delete file from storage automatically
        form.setValue('foto_perfil_url', '')
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="nombres"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombres *</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Juan Carlos" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Foto de perfil upload */}
            <div className="md:col-span-2">
                <FormField
                    control={form.control}
                    name="foto_perfil_url"
                    render={({ field }) => (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium">Foto de Perfil</label>
                            <div className="flex items-center gap-4">
                                {fotoUrl ? (
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-muted">
                                        <Image src={fotoUrl} alt="Foto" width={96} height={96} className="object-cover w-24 h-24" />
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">Sin foto</div>
                                )}

                                <div className="flex flex-col">
                                    <input id="foto-upload" type="file" accept="image/*" onChange={handleFileChange} />
                                    <div className="mt-2 flex gap-2">
                                        <Button size="sm" onClick={() => document.getElementById('foto-upload')?.click()} disabled={uploading}>
                                            <Upload className="mr-2 h-4 w-4" /> Subir
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={handleRemoveImage} disabled={!fotoUrl}>
                                            <Trash className="mr-2 h-4 w-4" /> Quitar
                                        </Button>
                                    </div>
                                    {uploading && <div className="text-sm text-muted-foreground mt-1">Subiendo...</div>}
                                </div>
                            </div>
                        </div>
                    )}
                />
            </div>

            <FormField
                control={form.control}
                name="apellidos"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Apellidos *</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Pérez Rodríguez" {...field} value={field.value || ""} />
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
                            <Input placeholder="Ej: 1234567890" {...field} value={field.value || ""} />
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
