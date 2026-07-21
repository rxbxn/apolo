import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { FotosMasivasUpload } from "@/components/personas/fotos-masivas-upload"

export const metadata = {
    title: "Fotos Masivas - Apolo",
    description: "Actualización masiva de fotos de perfil",
}

export default function FotosMasivasPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Fotos Masivas</h1>
                    <p className="text-muted-foreground">
                        Sube un ZIP o selecciona varias imágenes para actualizar la foto de perfil de
                        varias personas a la vez. Cada archivo debe llamarse igual al nombre completo
                        de la persona (nombres + apellidos) o a su número de cédula. Si el nombre no
                        coincide exacto por una tilde, también se busca ignorándolas.
                    </p>
                </div>

                <FotosMasivasUpload />
            </div>
        </DashboardLayout>
    )
}
