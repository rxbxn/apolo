"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useCoordinadores } from "@/lib/hooks/use-coordinadores"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash } from "lucide-react"
import { toast } from "sonner"
import { useConfirm } from "@/lib/hooks/use-confirm"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

export function DirigentesTable() {
    const { listarRelacionesDirigentes, loading } = useCoordinadores()
    const [dirigentes, setDirigentes] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setIsLoading(true)
                const data = await listarRelacionesDirigentes()
                if (mounted) setDirigentes(data || [])
            } catch (e) {
                console.error('Error cargando dirigentes:', e)
                if (mounted) setDirigentes([])
            } finally {
                if (mounted) setIsLoading(false)
            }
        }
        load()
        return () => { mounted = false }
    }, [listarRelacionesDirigentes])

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
                    {isLoading || loading ? (
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
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dirigentes.map((d) => (
                                        <tr key={d.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-foreground">
                                                <div className="font-medium">{(d.dirigente?.nombres || '') + ' ' + (d.dirigente?.apellidos || '')}</div>
                                                <div className="text-xs text-muted-foreground">{d.dirigente?.perfil_nombre}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-foreground">
                                                <div className="font-medium">{(d.coordinador?.nombres || '') + ' ' + (d.coordinador?.apellidos || '')}</div>
                                                <div className="text-xs text-muted-foreground">{d.coordinador?.perfil_nombre}</div>
                                            </td>
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
