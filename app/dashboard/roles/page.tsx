import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { RolesManager } from "@/components/roles/roles-manager"

export default function RolesPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Gestión de Roles</h1>
                    <p className="text-muted-foreground">
                        Asigna roles a los usuarios del sistema. Los roles determinan los permisos y acceso a módulos.
                    </p>
                </div>
                <RolesManager />
            </div>
        </DashboardLayout>
    )
}
