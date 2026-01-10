"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/shared/form-field"
import { FormSelect } from "@/components/shared/form-select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export function EventForm() {
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    time: "",
    location: "",
    attendees: "",
    status: "preparacion",
    description: "",
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Event form submitted:", formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/debate">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nuevo Evento</h1>
          <p className="text-muted-foreground">Crea un nuevo evento o debate</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Detalles del Evento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Nombre del Evento"
                placeholder="Ej: Debate sobre Salud"
                required
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
              <FormSelect
                label="Estado"
                options={[
                  { value: "preparacion", label: "Preparación" },
                  { value: "confirmado", label: "Confirmado" },
                  { value: "realizado", label: "Realizado" },
                ]}
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
              />
              <FormField
                label="Fecha"
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
              />
              <FormField
                label="Hora"
                type="time"
                value={formData.time}
                onChange={(e) => handleChange("time", e.target.value)}
              />
              <FormField
                label="Ubicación"
                placeholder="Ej: Teatro Municipal"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
              />
              <FormField
                label="Asistentes Esperados"
                type="number"
                placeholder="0"
                value={formData.attendees}
                onChange={(e) => handleChange("attendees", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Descripción</label>
              <textarea
                placeholder="Describe los detalles del evento..."
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Guardar Evento
              </Button>
              <Link href="/dashboard/debate">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
