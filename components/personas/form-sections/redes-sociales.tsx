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

interface RedesSocialesSectionProps {
    form: UseFormReturn<any>
}

export function RedesSocialesSection({ form }: RedesSocialesSectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="facebook"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Facebook</FormLabel>
                        <FormControl>
                            <Input placeholder="Usuario o enlace de perfil" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="instagram"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <FormControl>
                            <Input placeholder="@usuario" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="twitter"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Twitter (X)</FormLabel>
                        <FormControl>
                            <Input placeholder="@usuario" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="linkedin"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>LinkedIn</FormLabel>
                        <FormControl>
                            <Input placeholder="Enlace de perfil" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="tiktok"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>TikTok</FormLabel>
                        <FormControl>
                            <Input placeholder="@usuario" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}
