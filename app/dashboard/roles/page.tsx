import { RolesManager } from "@/components/roles/roles-manager"

export default function RolesPage() {
    return (
        <div className="container mx-auto py-6 px-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Gestión de Roles</h1>
                <p className="text-muted-foreground">
                    Asigna roles a los usuarios del sistema. Los roles determinan los permisos y acceso a módulos.
                </p>
            </div>
            <RolesManager />
        </div>
    )
}
