"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AgendaHeader() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [eventTitle, setEventTitle] = useState("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")
  const [selectedColor, setSelectedColor] = useState<"blanco" | "negro" | "gris" | "grisClaro">("blanco")

  const getColorClasses = (color: string) => {
    const colors = {
      blanco: "bg-gray-100 text-gray-800 border border-gray-300",
      negro: "bg-gray-800 text-white",
      gris: "bg-gray-400 text-white",
      grisClaro: "bg-gray-200 text-gray-700"
    }
    return colors[color as keyof typeof colors] || colors.blanco
  }

  const handleSaveEvent = async () => {
    try {
      const formData = new FormData()
      formData.append('titulo', eventTitle)
      formData.append('fecha_inicio', startDate)
      formData.append('hora_inicio', startTime)
      formData.append('fecha_fin', endDate)
      formData.append('hora_fin', endTime)
      formData.append('color', selectedColor)

      // Importar dinámicamente para evitar problemas de carga
      const { createAgendaEvento } = await import('@/lib/actions/agenda')
      await createAgendaEvento(formData)
      
      console.log("✅ Evento guardado exitosamente")
      
      resetForm()
      
    } catch (error) {
      console.error("❌ Error guardando evento:", error)
      alert("Error al guardar el evento: " + (error instanceof Error ? error.message : "Error desconocido"))
    }
  }

  const resetForm = () => {
    setEventTitle("")
    setStartDate("")
    setStartTime("")
    setEndDate("")
    setEndTime("")
    setSelectedColor("blanco")
    setIsDialogOpen(false)
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Planifica y organiza tu calendario de actividades</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Nuevo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nuevo Evento en Agenda</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="titulo">Agregar Titulo *</Label>
                <Input
                  id="titulo"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase' }}
                  placeholder="TÍTULO DEL EVENTO"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha-inicial">Fecha Inicial: *</Label>
                  <Input
                    id="fecha-inicial"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="hora-inicial">Hora Inicial: *</Label>
                  <Input
                    id="hora-inicial"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha-final">Fecha Final: *</Label>
                  <Input
                    id="fecha-final"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="hora-final">Hora Final: *</Label>
                  <Input
                    id="hora-final"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Color: *</Label>
                <div className="flex gap-2 mt-2">
                  {["blanco", "negro", "gris", "grisClaro"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color as any)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        selectedColor === color ? "border-gray-900" : "border-gray-300"
                      } ${getColorClasses(color)}`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-600 flex items-center gap-1">
                    Blanco ● Negro ● Gris ● Gris Claro ●
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveEvent}
                  className="bg-teal-600 hover:bg-teal-700 text-white flex-1"
                >
                  📁 GUARDAR EVENTO
                </Button>
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="flex-1"
                >
                  ❌ CERRAR
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
