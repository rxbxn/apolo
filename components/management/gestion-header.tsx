import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export function GestionHeader() {
    return (
        <DashboardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión Gerencial</h1>
                    <p className="text-muted-foreground">
                        Gestiona formatos de gestión y compromisos del sistema.
                    </p>
                </div>
                <Link href="/dashboard/gestion-gerencial/nuevo">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Formato
                    </Button>
                </Link>
            </div>
        </DashboardHeader>
    )
}