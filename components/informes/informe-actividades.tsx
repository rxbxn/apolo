'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useActividades, useConteoPorEstado, useCumplimientoPorCoordinador } from '@/lib/hooks/use-informes'

// Replica reportes.php de Zeus ("Informe de actividades"): chips de estado,
// barra de % total (Realizadas vs Faltantes), selector de Etapa Actual, y
// tabla de cumplimiento por coordinador.
export function InformeActividades() {
    const { actividades, loading: loadingActividades } = useActividades()
    const { conteo } = useConteoPorEstado()
    const [actividadId, setActividadId] = useState<string>('')

    useEffect(() => {
        if (!actividadId && actividades.length > 0) {
            setActividadId(actividades[0].id)
        }
    }, [actividades, actividadId])

    const { data: filas, loading: loadingCumplimiento } = useCumplimientoPorCoordinador(actividadId)

    const totalMilitantes = filas.reduce((acc, f) => acc + f.total, 0)
    const totalCumplidos = filas.reduce((acc, f) => acc + f.cumplidos, 0)
    const totalFaltantes = totalMilitantes - totalCumplidos
    const porcentajeCumplidos = totalMilitantes > 0 ? (totalCumplidos / totalMilitantes) * 100 : 0

    const chartData = [
        {
            nombre: '% Cumplimiento',
            Realizadas: Number(porcentajeCumplidos.toFixed(1)),
            Faltantes: Number((100 - porcentajeCumplidos).toFixed(1)),
        },
    ]

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Total Cumplimiento</CardTitle>
                    <p className="text-sm text-muted-foreground">Consolidado de personas por estado</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                        <ChipEstado label="Antiguos" valor={conteo.antiguos} />
                        <ChipEstado label="Nuevos" valor={conteo.nuevos} />
                        <ChipEstado label="Activos" valor={conteo.activos} />
                        <ChipEstado label="Suspendidos" valor={conteo.suspendidos} />
                        <ChipEstado label="Inactivos" valor={conteo.inactivos} />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                                    <XAxis type="number" domain={[0, 100]} unit="%" />
                                    <YAxis type="category" dataKey="nombre" width={100} />
                                    <Tooltip formatter={(value: number) => `${value}%`} />
                                    <Legend />
                                    <Bar dataKey="Realizadas" stackId="a" fill="#7fb8d9" />
                                    <Bar dataKey="Faltantes" stackId="a" fill="#5b57c9" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex flex-col justify-center gap-4">
                            <div>
                                <span className="text-3xl font-bold">
                                    {totalCumplidos} de {totalMilitantes}
                                </span>{' '}
                                <span className="text-red-500">({totalFaltantes})</span>
                            </div>
                            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                                <p className="mb-2 text-sm font-medium text-muted-foreground">Etapa Actual</p>
                                <Select value={actividadId} onValueChange={setActividadId} disabled={loadingActividades}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una etapa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {actividades.map((a) => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-muted-foreground">
                                <th className="p-3">Nombre</th>
                                <th className="p-3">Visitas</th>
                                <th className="p-3">Cumpl.</th>
                                <th className="p-3">Progreso</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingCumplimiento ? (
                                <tr>
                                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                                        Cargando...
                                    </td>
                                </tr>
                            ) : filas.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                                        Sin datos para esta etapa.
                                    </td>
                                </tr>
                            ) : (
                                filas.map((f, i) => (
                                    <tr key={f.coordinadorId} className="border-b last:border-0">
                                        <td className="p-3">
                                            {i + 1} - {f.nombre}
                                        </td>
                                        <td className="p-3">
                                            {f.cumplidos} de {f.total}
                                        </td>
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

function ChipEstado({ label, valor }: { label: string; valor: number }) {
    return (
        <span className="rounded-full bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white">
            {valor} {label.toUpperCase()}
        </span>
    )
}
