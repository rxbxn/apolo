"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAgenda } from "@/lib/hooks/use-agenda"
import { toast } from "sonner"

interface AgendaEvent {
  id: string
  titulo: string
  fecha_inicio: string
  hora_inicio: string
  fecha_fin?: string
  hora_fin?: string
  color: "blanco" | "negro" | "gris" | "grisClaro"
  descripcion?: string
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

const getColorClasses = (color: string) => {
  const colors = {
    blanco: "bg-blue-100 text-blue-800 border border-blue-200",
    negro: "bg-purple-200 text-purple-900 border border-purple-300",
    gris: "bg-green-100 text-green-800 border border-green-200",
    grisClaro: "bg-pink-100 text-pink-800 border border-pink-200"
  }
  return colors[color as keyof typeof colors] || colors.blanco
}

export function AgendaCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [eventTitle, setEventTitle] = useState("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")
  const [selectedColor, setSelectedColor] = useState<"blanco" | "negro" | "gris" | "grisClaro">("blanco")
  const [eventos, setEventos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Función para cargar eventos del mes
  const loadMonthEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { getAgendaEventosPorMes } = await import('@/lib/actions/agenda')
      const data = await getAgendaEventosPorMes(year, month)
      setEventos(data || [])
      console.log('Eventos cargados:', data)
    } catch (err) {
      console.error('Error cargando eventos:', err)
      setError('Error cargando eventos del mes')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  // Cargar eventos del mes actual cuando cambie la fecha
  useEffect(() => {
    loadMonthEvents()
  }, [loadMonthEvents])

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startDate_calc = new Date(firstDayOfMonth)
  
  // Ajustar para que la semana empiece en lunes (getDay() retorna 0 para domingo)
  const dayOfWeek = firstDayOfMonth.getDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startDate_calc.setDate(startDate_calc.getDate() - daysToSubtract)

  const endDate_calc = new Date(lastDayOfMonth)
  const endDayOfWeek = lastDayOfMonth.getDay()
  const daysToAdd = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek
  endDate_calc.setDate(endDate_calc.getDate() + daysToAdd)

  const calendarDays: Date[] = []
  const currentDay = new Date(startDate_calc)
  
  while (currentDay <= endDate_calc) {
    calendarDays.push(new Date(currentDay))
    currentDay.setDate(currentDay.getDate() + 1)
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return eventos.filter((evento: any) => evento.fecha_inicio === dateStr)
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const handleAddEvent = (date: Date) => {
    setSelectedDate(date)
    const dateStr = date.toISOString().split('T')[0]
    setStartDate(dateStr)
    setEndDate(dateStr)
    setIsDialogOpen(true)
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

      // Crear el evento directamente
      const { createAgendaEvento } = await import('@/lib/actions/agenda')
      await createAgendaEvento(formData)
      
      console.log("✅ Evento guardado exitosamente")
      toast.success("Evento guardado exitosamente")
      
      // Limpiar formulario
      setEventTitle("")
      setStartDate("")
      setStartTime("")
      setEndDate("")
      setEndTime("")
      setSelectedColor("blanco")
      setIsDialogOpen(false)
      
      // Recargar eventos del mes actual
      await loadMonthEvents()
      
    } catch (error) {
      console.error("❌ Error guardando evento:", error)
      toast.error("Error al guardar el evento: " + (error instanceof Error ? error.message : "Error desconocido"))
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
    <Card className="w-full">
      <CardContent className="p-6">
        {/* Indicador de carga */}
        {loading && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando eventos...</span>
          </div>
        )}
        
        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Header del calendario */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-700">
            {MONTHS[month]} año {year}
          </h2>
          <div className="flex items-center gap-4">
            {/* Botones de vista */}
            <div className="flex items-center gap-1 bg-white rounded-lg border shadow-sm p-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="bg-orange-500 text-white hover:bg-orange-600 rounded-md px-3 py-1.5 text-xs font-medium"
              >
                MES
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-600 hover:bg-gray-100 rounded-md px-3 py-1.5 text-xs font-medium"
              >
                SEMANA
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-600 hover:bg-gray-100 rounded-md px-3 py-1.5 text-xs font-medium"
              >
                DIA
              </Button>
            </div>
            
            {/* Botones de navegación */}
            <div className="flex items-center gap-1 bg-white rounded-lg border shadow-sm p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                className="text-gray-600 hover:bg-gray-100 rounded-md px-3 py-1.5 text-xs font-medium"
              >
                &lt;&lt; ANT
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="bg-teal-500 text-white hover:bg-teal-600 rounded-md px-4 py-1.5 text-xs font-medium"
              >
                HOY
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="text-gray-600 hover:bg-gray-100 rounded-md px-3 py-1.5 text-xs font-medium"
              >
                SIG &gt;&gt;
              </Button>
            </div>
          </div>
        </div>

        {/* Grid del calendario */}
        <div className="grid grid-cols-7 gap-1">
          {/* Headers de días de la semana */}
          {WEEKDAYS.map((day) => (
            <div key={day} className="p-2 text-center font-medium text-gray-600 bg-gray-100">
              {day}
            </div>
          ))}

          {/* Días del calendario */}
          {calendarDays.map((date, index) => {
            const isCurrentMonth = date.getMonth() === month
            const isToday = date.toDateString() === new Date().toDateString()
            const dayEvents = getEventsForDate(date)

            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border border-gray-200 relative ${
                  isCurrentMonth ? "bg-white" : "bg-gray-50"
                } ${isToday ? "bg-green-100" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${isCurrentMonth ? "text-gray-900" : "text-gray-400"}`}>
                    {date.getDate()}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                    onClick={() => handleAddEvent(date)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-1">
                  {dayEvents.map((evento: any) => (
                    <div
                      key={evento.id}
                      className={`text-xs p-1 rounded cursor-pointer ${getColorClasses(evento.color)}`}
                      title={`${evento.titulo} - ${evento.hora_inicio}`}
                    >
                      {evento.titulo.length > 15 ? `${evento.titulo.substring(0, 15)}...` : evento.titulo}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Dialog para crear nuevo evento */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                      className={`w-8 h-8 rounded-full border-2 ${
                        selectedColor === color ? "border-gray-900 ring-2 ring-gray-300" : "border-gray-300"
                      } ${getColorClasses(color)} flex items-center justify-center text-xs`}
                    >
                      {selectedColor === color && "✓"}
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600 flex items-center gap-1">
                    Azul Pastel ● Púrpura Pastel ● Verde Pastel ● Rosa Pastel
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
      </CardContent>
    </Card>
  )
}
