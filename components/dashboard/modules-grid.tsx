"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Users, BarChart3, Calendar, FileText, Building2, ArrowRight, UserCheck, UserPlus } from "lucide-react"

const MODULES = [
  {
    title: "Actividades",
    description: "Registra y gestiona actividades  y visitas de terreno",
    href: "/dashboard/activities",
    icon: Activity,
    color: "bg-blue-100 dark:bg-blue-900",
    accentColor: "text-blue-600 dark:text-blue-400",
  },
  {
    title: "Módulo Personas",
    description: "Administra fichas técnicas y perfiles de personas ",
    href: "/dashboard/personas",
    icon: Users,
    color: "bg-green-100 dark:bg-green-900",
    accentColor: "text-green-600 dark:text-green-400",
  },
  {
    title: "Módulo Coordinador",
    description: "Gestiona coordinadores políticos con acceso al sistema",
    href: "/dashboard/coordinador",
    icon: UserCheck,
    color: "bg-teal-100 dark:bg-teal-900",
    accentColor: "text-teal-600 dark:text-teal-400",
  },
  {
    title: "Módulo Dirigente",
    description: "Gestiona dirigentes políticos (coordinadores con perfil dirigente)",
    href: "/dashboard/dirigente",
    icon: UserCheck,
    color: "bg-yellow-100 dark:bg-yellow-900",
    accentColor: "text-yellow-600 dark:text-yellow-400",
  },
  {
    title: "Módulo Militante",
    description: "Gestiona militantes políticos del sistema",
    href: "/dashboard/militante",
    icon: UserPlus,
    color: "bg-cyan-100 dark:bg-cyan-900",
    accentColor: "text-cyan-600 dark:text-cyan-400",
  },
  {
    title: "Gestión Gerencial",
    description: "Visualiza reportes, métricas y desempeño del equipo",
    href: "/dashboard/management",
    icon: BarChart3,
    color: "bg-purple-100 dark:bg-purple-900",
    accentColor: "text-purple-600 dark:text-purple-400",
  },
  {
    title: "Alistamiento de Debate",
    description: "Organiza y prepara eventos, debates y reuniones",
    href: "/dashboard/debate",
    icon: FileText,
    color: "bg-orange-100 dark:bg-orange-900",
    accentColor: "text-orange-600 dark:text-orange-400",
  },
  {
    title: "Crear Asignar Datos",
    description: "Asigna datos y recursos a coordinadores y líderes",
    href: "/dashboard/assign-data",
    icon: Building2,
    color: "bg-red-100 dark:bg-red-900",
    accentColor: "text-red-600 dark:text-red-400",
  },
  {
    title: "Agenda",
    description: "Planifica y organiza tu calendario de actividades",
    href: "/dashboard/agenda",
    icon: Calendar,
    color: "bg-indigo-100 dark:bg-indigo-900",
    accentColor: "text-indigo-600 dark:text-indigo-400",
  },
]

export function ModulesGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {MODULES.map((module) => {
        const Icon = module.icon
        return (
          <Link key={module.href} href={module.href}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-0 bg-card">
              <CardHeader>
                <div className={`w-12 h-12 ${module.color} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${module.accentColor}`} />
                </div>
                <CardTitle className="text-lg">{module.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-sm">{module.description}</CardDescription>
                <div className="flex items-center text-primary font-medium text-sm">
                  Acceder
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
