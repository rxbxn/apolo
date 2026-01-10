"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/shared/form-field"
import { FormSelect } from "@/components/shared/form-select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export function AssignmentForm() {
  const [formData, setFormData] = useState({
    coordinator: "",
    zone: "",
    dataCount: "",
    description: "",
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Assignment form submitted:", formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/assign-data">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nueva Asignación</h1>
          <p className="text-muted-foreground">Asigna datos a coordinadores y líderes</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Detalles de Asignación</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Coordinador"
                placeholder="Nombre del coordinador"
                required
                value={formData.coordinator}
                onChange={(e) => handleChange("coordinator", e.target.value)}
              />
              <FormSelect
                label="Zona de Trabajo"
                options={[
                  { value: "Centro", label: "Centro" },
                  { value: "Norte", label: "Norte" },
                  { value: "Sur", label: "Sur" },
                  { value: "Oriente", label: "Oriente" },
                  { value: "Occidente", label: "Occidente" },
                ]}
                value={formData.zone}
                onChange={(e) => handleChange("zone", e.target.value)}
              />
              <FormField
                label="Cantidad de Registros"
                type="number"
                placeholder="0"
                value={formData.dataCount}
                onChange={(e) => handleChange("dataCount", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Descripción</label>
              <textarea
                placeholder="Detalles sobre los datos a asignar..."
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Guardar Asignación
              </Button>
              <Link href="/dashboard/assign-data">
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
