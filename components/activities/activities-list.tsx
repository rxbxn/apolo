"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, Users, MoreVertical } from "lucide-react"

interface Activity {
  id: string
  title: string
  type: "visita" | "reunion" | "evento" | "capacitacion"
  date: string
  location: string
  attendees: number
  status: "pendiente" | "en-progreso" | "completada"
}

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "1",
    title: "Visita Barrial - Sector Centro",
    type: "visita",
    date: "2024-12-15",
    location: "Centro, Ciudad",
    attendees: 8,
    status: "en-progreso",
  },
  {
    id: "2",
    title: "Reunión con Líderes Comunitarios",
    type: "reunion",
    date: "2024-12-16",
    location: "Sala Comunal Norte",
    attendees: 15,
    status: "pendiente",
  },
  {
    id: "3",
    title: "Evento de Lanzamiento de Campaña",
    type: "evento",
    date: "2024-12-20",
    location: "Plaza Principal",
    attendees: 250,
    status: "pendiente",
  },
]

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    visita: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    reunion: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    evento: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    capacitacion: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  }
  return colors[type] || colors.visita
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    "en-progreso": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    completada: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  }
  return colors[status] || colors.pendiente
}

export function ActivitiesList() {
  return (
    <div className="grid gap-4">
      {MOCK_ACTIVITIES.map((activity) => (
        <Card key={activity.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-foreground">{activity.title}</h3>
                  <Badge className={getTypeColor(activity.type)}>{activity.type}</Badge>
                  <Badge className={getStatusColor(activity.status)}>{activity.status}</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>{activity.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{activity.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span>{activity.attendees} personas</span>
                  </div>
                </div>
              </div>

              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
