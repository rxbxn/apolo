import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { InformeActividades } from "@/components/informes/informe-actividades"
import { ExportarInformes } from "@/components/informes/exportar-informes"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"

export const metadata = {
    title: "Informe de Actividades - APOLO",
    description: "Cumplimiento de actividades por coordinador",
}

export default function InformesPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Informe de Actividades</h1>
                        <p className="text-muted-foreground">Cumplimiento de actividades por coordinador.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link href="/dashboard/informes/graficas">
                            <Button variant="outline">
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Gráficas por etapa
                            </Button>
                        </Link>
                        <ExportarInformes />
                    </div>
                </div>
                <InformeActividades />
            </div>
        </DashboardLayout>
    )
}
