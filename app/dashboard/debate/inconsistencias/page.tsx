import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { InconsistenciasTable } from "@/components/debate/inconsistencias/inconsistencias-table"
import { InconsistenciasForm } from "@/components/debate/inconsistencias/inconsistencias-form"
import { getInconsistencias } from "@/lib/actions/debate"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const metadata = {
    title: "Inconsistencias - Alistamiento Debate",
    description: "Gestión de inconsistencias",
}

export default async function InconsistenciasPage() {
    const inconsistencias = await getInconsistencias()

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
                        <h1 className="text-3xl font-bold tracking-tight">Inconsistencias</h1>
                        <p className="text-muted-foreground">
                            Reporte y resolución de inconsistencias.
                        </p>
                    </div>
                    <InconsistenciasForm />
                </div>
                <InconsistenciasTable inconsistencias={inconsistencias} />
            </div>
        </DashboardLayout>
    )
}
