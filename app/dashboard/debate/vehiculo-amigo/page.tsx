import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { VehiculoAmigoTable } from "@/components/debate/vehiculo-amigo/vehiculo-amigo-table"
import { VehiculoAmigoForm } from "@/components/debate/vehiculo-amigo/vehiculo-amigo-form"
import { getVehiculosAmigos } from "@/lib/actions/debate"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const metadata = {
    title: "Vehículo Amigo - Alistamiento Debate",
    description: "Gestión de vehículos amigos",
}

export default async function VehiculoAmigoPage() {
    const vehiculos = await getVehiculosAmigos()

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
                        <h1 className="text-3xl font-bold tracking-tight">Vehículo Amigo</h1>
                        <p className="text-muted-foreground">
                            Registro de vehículos de apoyo.
                        </p>
                    </div>
                    <VehiculoAmigoForm />
                </div>
                <VehiculoAmigoTable vehiculos={vehiculos} />
            </div>
        </DashboardLayout>
    )
}
