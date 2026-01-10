import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PublicidadVehiculoTable } from "@/components/debate/publicidad-vehiculo/publicidad-vehiculo-table"
import { PublicidadVehiculoForm } from "@/components/debate/publicidad-vehiculo/publicidad-vehiculo-form"
import { getPublicidadVehiculos } from "@/lib/actions/debate"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const metadata = {
    title: "Publicidad Vehículo - Alistamiento Debate",
    description: "Gestión de publicidad en vehículos",
}

export default async function PublicidadVehiculoPage() {
    const publicidad = await getPublicidadVehiculos()

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
                        <h1 className="text-3xl font-bold tracking-tight">Publicidad Vehículo</h1>
                        <p className="text-muted-foreground">
                            Control de publicidad en vehículos.
                        </p>
                    </div>
                    <PublicidadVehiculoForm />
                </div>
                <PublicidadVehiculoTable publicidad={publicidad} />
            </div>
        </DashboardLayout>
    )
}
