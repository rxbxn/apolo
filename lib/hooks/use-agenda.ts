import { useState, useEffect } from 'react'
import { 
  AgendaEvento,
  getAgendaEventos, 
  getAgendaEventosPorMes,
  createAgendaEvento,
  updateAgendaEvento,
  deleteAgendaEvento
} from '@/lib/actions/agenda'
import { toast } from 'sonner'

export function useAgenda() {
  const [eventos, setEventos] = useState<AgendaEvento[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarEventos = async (fechaInicio?: string, fechaFin?: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAgendaEventos(fechaInicio, fechaFin)
      setEventos(data)
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error cargando eventos'
      setError(mensaje)
      console.error('Error cargando eventos:', err)
    } finally {
      setLoading(false)
    }
  }

  const cargarEventosPorMes = async (year: number, month: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAgendaEventosPorMes(year, month)
      setEventos(data)
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error cargando eventos del mes'
      setError(mensaje)
      console.error('Error cargando eventos del mes:', err)
    } finally {
      setLoading(false)
    }
  }

  const crear = async (formData: FormData) => {
    try {
      setLoading(true)
      const nuevoEvento = await createAgendaEvento(formData)
      setEventos(prev => [...prev, nuevoEvento])
      toast.success('Evento creado exitosamente')
      return nuevoEvento
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error creando evento'
      setError(mensaje)
      toast.error(mensaje)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const actualizar = async (id: string, formData: FormData) => {
    try {
      setLoading(true)
      const eventoActualizado = await updateAgendaEvento(id, formData)
      setEventos(prev => prev.map(e => e.id === id ? eventoActualizado : e))
      toast.success('Evento actualizado exitosamente')
      return eventoActualizado
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error actualizando evento'
      setError(mensaje)
      toast.error(mensaje)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const eliminar = async (id: string) => {
    try {
      setLoading(true)
      await deleteAgendaEvento(id)
      setEventos(prev => prev.filter(e => e.id !== id))
      toast.success('Evento eliminado exitosamente')
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error eliminando evento'
      setError(mensaje)
      toast.error(mensaje)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    eventos,
    loading,
    error,
    cargarEventos,
    cargarEventosPorMes,
    crear,
    actualizar,
    eliminar
  }
}