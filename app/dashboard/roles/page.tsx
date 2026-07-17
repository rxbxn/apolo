import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { RolesManagerTabs } from "@/components/roles/roles-manager-tabs"

export default function RolesPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Gestión de Roles</h1>
                    <p className="text-muted-foreground">
                        Asigna roles a los usuarios del sistema y define a qué módulos tiene acceso cada rol.
                    </p>
                </div>
                <RolesManagerTabs />
            </div>
        </DashboardLayout>
    )
}
