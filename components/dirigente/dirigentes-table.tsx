"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Trash, ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useConfirm } from "@/lib/hooks/use-confirm"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { supabase } from "@/lib/supabase/client"
import { useUsuario } from "@/lib/hooks/use-usuario"
import { usePermisos } from "@/lib/hooks/use-permisos"

const PAGE_SIZE = 20

export function DirigentesTable() {
    const { usuario } = useUsuario()
    const { permisos, loading: permisosLoading } = usePermisos("Módulo Dirigente")

    const [dirigentes, setDirigentes]   = useState<any[]>([])
    const [total, setTotal]             = useState(0)
    const [page, setPage]               = useState(0)          // 0-based
    const [isLoading, setIsLoading]     = useState(false)
    const [pendingDelete, setPendingDelete] = useState<any | null>(null)
    const { isOpen, config, handleCancel, setIsOpen } = useConfirm()

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    // ── Carga paginada ──────────────────────────────────────────
    const load = useCallback(async (pg: number) => {
        setIsLoading(true)
        try {
            // 1. Contar total
            const { count } = await supabase
                .from('dirigentes')
                .select('*', { count: 'exact', head: true })
            setTotal(count ?? 0)

            // 2. Obtener página de relaciones
            const from = pg * PAGE_SIZE
            const to   = from + PAGE_SIZE - 1
            const { data: rels, error: relsErr } = await supabase
                .from('dirigentes')
                .select('id, id_dirigente, id_coordinador')
                .range(from, to)
            if (relsErr) throw relsErr
            if (!rels || rels.length === 0) { setDirigentes([]); return }

            // 3. Recopilar todos los IDs únicos de coordinadores
            const ids = [...new Set([
                ...rels.map((r: any) => r.id_dirigente),
                ...rels.map((r: any) => r.id_coordinador).filter(Boolean),
            ])]

            // 4. Un solo query para resolver nombres — evita N+1
            const { data: coords } = await supabase
                .from('v_coordinadores_completo')
                .select('coordinador_id, nombres, apellidos, numero_documento, estado')
                .in('coordinador_id', ids)

            const coordMap: Record<string, any> = {}
            ;(coords || []).forEach((c: any) => { coordMap[c.coordinador_id] = c })

            const nombre = (id: string) => {
                const c = coordMap[id]
                if (!c) return id
                return `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim() || c.numero_documento || id
            }

            setDirigentes(rels.map((r: any) => ({
                id:                 r.id,                    // PK real de dirigentes (bigint) — antes se usaba
                                                               // r.id_dirigente por error, que se repite una vez
                                                               // por cada coordinador que reporta al mismo
                                                               // dirigente, y rompía tanto la key de React como
                                                               // el botón Eliminar (mandaba el UUID equivocado).
                dirigente_id:       r.id_dirigente,
                coordinador_id:     r.id_coordinador,
                dirigente_nombre:   nombre(r.id_dirigente),
                coordinador_nombre: nombre(r.id_coordinador),
                estado:             coordMap[r.id_dirigente]?.estado ?? 'activo',
            })))
        } catch (e) {
            console.error('Error cargando dirigentes:', e)
            setDirigentes([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { load(page) }, [load, page])

    // ── Eliminar ────────────────────────────────────────────────
    async function onDeleteConfirmed() {
        if (!pendingDelete) return
        try {
            const res = await fetch('/api/dirigente/eliminar', {
                method:  'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ id: pendingDelete.id }),
            })
            if (!res.ok) {
                const err = await res.json()
                toast.error(err?.error || 'Error eliminando')
                return
            }
            toast.success('Eliminado correctamente')
            load(page)
        } catch (e) {
            console.error('Error eliminando dirigente:', e)
            toast.error('Error eliminando')
        } finally {
            setPendingDelete(null)
            handleCancel()
        }
    }

    // ── Loading de permisos ─────────────────────────────────────
    if (permisosLoading) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="flex items-center justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        )
    }

    if (!permisos?.leer) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center text-muted-foreground">
                    No tienes permisos para ver este módulo
                </CardContent>
            </Card>
        )
    }

    // ── Render ──────────────────────────────────────────────────
    return (
        <>
        <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : dirigentes.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        No se encontraron dirigentes
                    </div>
                ) : (
                    <>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Dirigente</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Coordinador</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Estado</th>
                                    {permisos?.eliminar && (
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Acciones</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {dirigentes.map((d) => (
                                    <tr key={d.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-foreground font-medium">
                                            {d.dirigente_nombre}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                            {d.coordinador_nombre || '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className={
                                                d.estado === 'activo'
                                                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                            }>
                                                {d.estado}
                                            </Badge>
                                        </td>
                                        {permisos?.eliminar && (
                                            <td className="px-6 py-4">
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => {
                                                        setPendingDelete(d)
                                                        setIsOpen(true)
                                                    }}
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Paginador ───────────────────────────── */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                        <span className="text-sm text-muted-foreground">
                            {total} dirigentes · página {page + 1} de {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page === 0}
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Anterior
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            >
                                Siguiente
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    </>
                )}
            </CardContent>
        </Card>

        <ConfirmDialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) setPendingDelete(null)
                setIsOpen(open)
            }}
            title={config?.title || 'Confirmar eliminación'}
            description={config?.description || '¿Estás seguro de eliminar este dirigente?'}
            confirmText={config?.confirmText || 'Eliminar'}
            cancelText={config?.cancelText || 'Cancelar'}
            variant={(config?.variant as any) || 'destructive'}
            onConfirm={onDeleteConfirmed}
        />
        </>
    )
}
