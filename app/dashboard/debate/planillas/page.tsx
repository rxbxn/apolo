import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PlanillasTable } from "@/components/debate/planillas/planillas-table"
import { PlanillasForm } from "@/components/debate/planillas/planillas-form"
import { PlanillasUpload } from "@/components/debate/planillas/planillas-upload"
import { getPlanillas } from "@/lib/actions/debate"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const metadata = {
    title: "Planillas - Alistamiento Debate",
    description: "Gestión de planillas",
}

export default async function PlanillasPage() {
    const planillas = await getPlanillas()

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
                        <h1 className="text-3xl font-bold tracking-tight">Planillas</h1>
                        <p className="text-muted-foreground">
                            Registro y control de planillas.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <PlanillasUpload />
                        <PlanillasForm />
                    </div>
                </div>
                <PlanillasTable planillas={planillas} />
            </div>
        </DashboardLayout>
    )
}
