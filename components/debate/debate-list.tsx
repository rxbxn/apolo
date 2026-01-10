"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, Users, CheckCircle } from "lucide-react"

interface Event {
  id: string
  name: string
  date: string
  time: string
  location: string
  attendees: number
  status: "preparacion" | "confirmado" | "realizado"
}

const MOCK_EVENTS: Event[] = [
  {
    id: "1",
    name: "Debate Público - Salud",
    date: "2024-12-20",
    time: "18:00",
    location: "Teatro Municipal",
    attendees: 150,
    status: "preparacion",
  },
  {
    id: "2",
    name: "Foro de Educación",
    date: "2024-12-22",
    time: "19:00",
    location: "Universidad Central",
    attendees: 200,
    status: "confirmado",
  },
  {
    id: "3",
    name: "Reunión con Líderes",
    date: "2024-12-18",
    time: "14:00",
    location: "Centro de Acopio",
    attendees: 50,
    status: "realizado",
  },
]

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    preparacion: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    confirmado: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    realizado: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  }
  return colors[status] || colors.preparacion
}

export function DebateList() {
  return (
    <div className="grid gap-4">
      {MOCK_EVENTS.map((event) => (
        <Card key={event.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-foreground">{event.name}</h3>
                  <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>
                      {event.date} - {event.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span>{event.attendees} personas</span>
                  </div>
                </div>
              </div>

              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <CheckCircle className="w-4 h-4" />
                Detalles
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
