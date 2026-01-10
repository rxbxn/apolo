import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { CasaEstrategicaTable } from "@/components/debate/casa-estrategica/casa-estrategica-table"
import { CasaEstrategicaForm } from "@/components/debate/casa-estrategica/casa-estrategica-form"
import { getCasasEstrategicas } from "@/lib/actions/debate"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const metadata = {
    title: "Casa Estratégica - Alistamiento Debate",
    description: "Gestión de casas estratégicas",
}

export default async function CasaEstrategicaPage() {
    const casas = await getCasasEstrategicas()

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
                        <h1 className="text-3xl font-bold tracking-tight">Casa Estratégica</h1>
                        <p className="text-muted-foreground">
                            Gestión de casas estratégicas y publicidad.
                        </p>
                    </div>
                    <CasaEstrategicaForm />
                </div>
                <CasaEstrategicaTable casas={casas} />
            </div>
        </DashboardLayout>
    )
}
