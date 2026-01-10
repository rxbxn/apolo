import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export const metadata = {
    title: "Reportes - Alistamiento Debate",
    description: "Reportes generales",
}

async function getStats() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { count: planillas } = await supabase.from('debate_planillas').select('*', { count: 'exact', head: true })
    const { count: inconsistencias } = await supabase.from('debate_inconsistencias').select('*', { count: 'exact', head: true })
    const { count: casas } = await supabase.from('debate_casa_estrategica').select('*', { count: 'exact', head: true })
    const { count: vehiculos } = await supabase.from('debate_vehiculo_amigo').select('*', { count: 'exact', head: true })
    const { count: publicidad } = await supabase.from('debate_publicidad_vehiculo').select('*', { count: 'exact', head: true })

    return { planillas, inconsistencias, casas, vehiculos, publicidad }
}

export default async function ReportesPage() {
    const stats = await getStats()

    return (
        <DashboardLayout>
            <div className="space-y-6 p-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/debate">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
                        <p className="text-muted-foreground">
                            Resumen general de la gestión.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Planillas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.planillas}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Inconsistencias</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.inconsistencias}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Casas Estratégicas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.casas}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Vehículos Amigos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.vehiculos}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Publicidad Vehicular</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.publicidad}</div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    )
}
