import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { GraficasEtapas } from "@/components/informes/graficas-etapas"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const metadata = {
    title: "Gráficas por Etapa - APOLO",
    description: "Cumplimiento por coordinador en cada etapa",
}

export default function GraficasInformesPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/informes">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Gráficas por Etapa</h1>
                        <p className="text-muted-foreground">Cumplimiento por coordinador, una pestaña por etapa.</p>
                    </div>
                </div>
                <GraficasEtapas />
            </div>
        </DashboardLayout>
    )
}
