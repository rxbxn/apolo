import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, AlertTriangle, Home, Car, Megaphone, BarChart3 } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Alistamiento Debate - APOLO",
  description: "Gestión administrativa de campaña",
}

const modules = [
  {
    title: "Planillas",
    description: "Registro de planillas de coordinadores y militantes.",
    icon: ClipboardList,
    href: "/dashboard/debate/planillas",
    color: "text-blue-500",
  },
  {
    title: "Inconsistencias",
    description: "Reporte y resolución de inconsistencias.",
    icon: AlertTriangle,
    href: "/dashboard/debate/inconsistencias",
    color: "text-yellow-500",
  },
  {
    title: "Casa Estratégica",
    description: "Gestión de casas estratégicas y publicidad.",
    icon: Home,
    href: "/dashboard/debate/casa-estrategica",
    color: "text-green-500",
  },
  {
    title: "Vehículo Amigo",
    description: "Registro de vehículos de apoyo.",
    icon: Car,
    href: "/dashboard/debate/vehiculo-amigo",
    color: "text-purple-500",
  },
  {
    title: "Publicidad Vehículo",
    description: "Control de publicidad en vehículos.",
    icon: Megaphone,
    href: "/dashboard/debate/publicidad-vehiculo",
    color: "text-red-500",
  },
  {
    title: "Reportes",
    description: "Visualización de métricas y exportación.",
    icon: BarChart3,
    href: "/dashboard/debate/reportes",
    color: "text-orange-500",
  },
]

export default function DebatePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alistamiento Debate</h1>
          <p className="text-muted-foreground">
            Gestión administrativa y logística de la campaña.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Link key={module.title} href={module.href}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {module.title}
                  </CardTitle>
                  <module.icon className={`h-4 w-4 ${module.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold"></div>
                  <p className="text-xs text-muted-foreground">
                    {module.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
