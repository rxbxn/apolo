"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, Database, Calendar, CheckCircle } from "lucide-react"

interface Assignment {
  id: string
  coordinator: string
  dataCount: number
  zone: string
  assignDate: string
  status: "pendiente" | "aceptado" | "completado"
}

const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: "1",
    coordinator: "Juan González",
    dataCount: 150,
    zone: "Centro",
    assignDate: "2024-12-15",
    status: "completado",
  },
  { id: "2", coordinator: "María López", dataCount: 120, zone: "Norte", assignDate: "2024-12-16", status: "aceptado" },
  {
    id: "3",
    coordinator: "Carlos Martínez",
    dataCount: 100,
    zone: "Sur",
    assignDate: "2024-12-17",
    status: "pendiente",
  },
]

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    aceptado: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    completado: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  }
  return colors[status] || colors.pendiente
}

export function AssignmentList() {
  return (
    <div className="grid gap-4">
      {MOCK_ASSIGNMENTS.map((assignment) => (
        <Card key={assignment.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-foreground">{assignment.coordinator}</h3>
                  <Badge className={getStatusColor(assignment.status)}>{assignment.status}</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    <span>{assignment.dataCount} registros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span>Zona: {assignment.zone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>{assignment.assignDate}</span>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="gap-2 bg-transparent">
                <CheckCircle className="w-4 h-4" />
                Ver Detalles
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
