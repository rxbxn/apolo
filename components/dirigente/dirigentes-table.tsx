"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash } from "lucide-react"
import { toast } from "sonner"
import { useConfirm } from "@/lib/hooks/use-confirm"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { supabase } from "@/lib/supabase/client"

export function DirigentesTable() {
    const [dirigentes, setDirigentes] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setIsLoading(true)

                // 1) Obtener filas desde tabla 'dirigentes'
                const { data: rows, error: rowsErr } = await supabase
                    .from('dirigentes')
                    .select('*')

                if (rowsErr) throw rowsErr

                const items = await Promise.all((rows || []).map(async (r: any) => {
                    // resolver nombres desde v_coordinadores_completo por id
                    const { data: d1 } = await supabase
                        .from('v_coordinadores_completo')
                        .select('coordinador_id, nombres, apellidos, numero_documento')
                        .eq('coordinador_id', r.id_dirigente)
                        .limit(1)
                        .single()

                    const { data: d2 } = await supabase
                        .from('v_coordinadores_completo')
                        .select('coordinador_id, nombres, apellidos, numero_documento')
                        .eq('coordinador_id', r.id_coordinador)
                        .limit(1)
                        .single()

                    return {
                        id: r.id,
                        dirigente_id: r.id_dirigente,
                        coordinador_id: r.id_coordinador,
                        dirigente_nombre: d1 ? `${(d1 as any).nombres || ''} ${(d1 as any).apellidos || ''}`.trim() : null,
                        coordinador_nombre: d2 ? `${(d2 as any).nombres || ''} ${(d2 as any).apellidos || ''}`.trim() : null,
                        creado_en: r.created_at || r.created_at || r.creado_en || null,
                    }
                }))

                if (mounted) setDirigentes(items)
            } catch (e) {
                console.error('Error cargando dirigentes desde tabla dirigentes:', e)
                if (mounted) setDirigentes([])
            } finally {
                if (mounted) setIsLoading(false)
            }
        }
        load()
        return () => { mounted = false }
    }, [])

    const { confirm, isOpen, config, handleConfirm, handleCancel, setIsOpen } = useConfirm()
    const [pendingDelete, setPendingDelete] = useState<any | null>(null)

    async function onDeleteConfirmed() {
        if (!pendingDelete) return

        try {
            const res = await fetch('/api/dirigente/eliminar', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: pendingDelete.id })
            })

            if (!res.ok) {
                const err = await res.json()
                toast.error(err?.error || 'Error eliminando')
                setPendingDelete(null)
                return
            }

            toast.success('Eliminado')
            window.location.reload()
        } catch (e) {
            console.error('Error eliminando dirigente:', e)
            toast.error('Error eliminando')
        } finally {
            setPendingDelete(null)
            handleCancel()
        }
    }

    return (
        <>
        <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : dirigentes.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">No se encontraron dirigentes</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Dirigente</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Coordinador</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Estado</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dirigentes.map((d) => (
                                    <tr key={d.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-foreground">{d.dirigente_nombre || d.dirigente_id}</td>
                                        <td className="px-6 py-4 text-sm text-foreground">{d.coordinador_nombre || d.coordinador_id}</td>
                                        <td className="px-6 py-4"><Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">activo</Badge></td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="destructive" onClick={async () => {
                                                    setPendingDelete(d)
                                                    // open confirm dialog using hook
                                                    setIsOpen(true)
                                                }}>
                                                    <Trash className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
        <ConfirmDialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    // if closing without confirm, clear pending
                    setPendingDelete(null)
                }
                setIsOpen(open)
            }}
            title={config?.title || 'Confirmar eliminación'}
            description={config?.description || '¿Estás seguro de eliminar este registro?'}
            confirmText={config?.confirmText || 'Eliminar'}
            cancelText={config?.cancelText || 'Cancelar'}
            variant={config?.variant as any || 'destructive'}
            onConfirm={onDeleteConfirmed}
        />
        </>
    )
}
