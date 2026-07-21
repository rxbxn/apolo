'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useActividades, useCumplimientoPorCoordinador } from '@/lib/hooks/use-informes'
import { cn } from '@/lib/utils'

// Replica graficas.php de Zeus: una pestaña por etapa, cada una con un
// gráfico de barras apiladas por coordinador (Cumplido vs Faltante) y la
// misma tabla debajo. A diferencia del "Informe de actividades" (que
// muestra una sola etapa a la vez elegida en un selector), aquí se navega
// por pestañas — igual que en Zeus.
export function GraficasEtapas() {
    const { actividades, loading } = useActividades()
    const [actividadId, setActividadId] = useState<string>('')

    const activa = actividadId || actividades[0]?.id || ''
    const { data: filas, loading: loadingCumplimiento } = useCumplimientoPorCoordinador(activa)

    const chartData = filas.map((f) => ({
        nombre: f.nombre.length > 22 ? f.nombre.slice(0, 22) + '…' : f.nombre,
        Cumplido: Number(f.cumplimiento.toFixed(1)),
        Faltante: Number((100 - f.cumplimiento).toFixed(1)),
    }))

    if (loading) {
        return <p className="text-muted-foreground">Cargando etapas...</p>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {actividades.map((a) => (
                    <button
                        key={a.id}
                        onClick={() => setActividadId(a.id)}
                        className={cn(
                            'rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors',
                            (activa === a.id) ? 'bg-teal-700' : 'bg-teal-500 hover:bg-teal-600'
                        )}
                    >
                        {a.nombre.toUpperCase()}
                    </button>
                ))}
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} interval={0} fontSize={11} />
                                <YAxis unit="%" domain={[0, 100]} />
                                <Tooltip formatter={(value: number) => `${value}%`} />
                                <Legend />
                                <Bar dataKey="Cumplido" stackId="a" fill="#7fcf9e" />
                                <Bar dataKey="Faltante" stackId="a" fill="#e08585" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-muted-foreground">
                                <th className="p-3">Nombre</th>
                                <th className="p-3">Faltante</th>
                                <th className="p-3">Cumplimiento</th>
                                <th className="p-3">Progreso</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingCumplimiento ? (
                                <tr>
                                    <td colSpan={4} className="p-6 text-center text-muted-foreground">Cargando...</td>
                                </tr>
                            ) : filas.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-6 text-center text-muted-foreground">Sin datos para esta etapa.</td>
                                </tr>
                            ) : (
                                filas.map((f) => (
                                    <tr key={f.coordinadorId} className="border-b last:border-0">
                                        <td className="p-3">{f.nombre}</td>
                                        <td className="p-3">{f.faltante}</td>
                                        <td className="p-3">{f.cumplimiento.toFixed(1)}%</td>
                                        <td className="p-3">
                                            <Progress value={f.cumplimiento} className="h-2 w-40" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    )
}
