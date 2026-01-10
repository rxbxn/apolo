import { supabase } from '@/lib/supabase/client'

export interface AgendaEvento {
  id: string
  titulo: string
  fecha_inicio: string
  hora_inicio: string
  fecha_fin?: string
  hora_fin?: string
  color: 'blanco' | 'negro' | 'gris' | 'grisClaro'
  descripcion?: string
  usuario_id?: string
  activo: boolean
  creado_en: string
  actualizado_en: string
}

export interface AgendaEventoInsert {
  titulo: string
  fecha_inicio: string
  hora_inicio: string
  fecha_fin?: string
  hora_fin?: string
  color: 'blanco' | 'negro' | 'gris' | 'grisClaro'
  descripcion?: string
}

// Crear un nuevo evento
export async function createAgendaEvento(formData: FormData) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Usuario no autenticado')
  }

  const evento: AgendaEventoInsert = {
    titulo: formData.get('titulo') as string,
    fecha_inicio: formData.get('fecha_inicio') as string,
    hora_inicio: formData.get('hora_inicio') as string,
    fecha_fin: formData.get('fecha_fin') as string || undefined,
    hora_fin: formData.get('hora_fin') as string || undefined,
    color: formData.get('color') as 'blanco' | 'negro' | 'gris' | 'grisClaro',
    descripcion: formData.get('descripcion') as string || undefined,
  }

  const supabaseClient = supabase as any
  const { data, error } = await supabaseClient
    .from('agenda_eventos')
    .insert({
      ...evento,
      usuario_id: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error creando evento:', error)
    throw new Error(error.message)
  }

  return data
}

// Obtener eventos por rango de fechas
export async function getAgendaEventos(fechaInicio?: string, fechaFin?: string) {
  let query = supabase
    .from('agenda_eventos')
    .select('*')
    .eq('activo', true)
    .order('fecha_inicio', { ascending: true })
    .order('hora_inicio', { ascending: true })

  if (fechaInicio) {
    query = query.gte('fecha_inicio', fechaInicio)
  }

  if (fechaFin) {
    query = query.lte('fecha_inicio', fechaFin)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error obteniendo eventos:', error)
    throw new Error(error.message)
  }

  return data || []
}

// Obtener eventos de un mes específico
export async function getAgendaEventosPorMes(year: number, month: number) {
  const fechaInicio = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const fechaFin = `${year}-${String(month + 1).padStart(2, '0')}-31`

  return getAgendaEventos(fechaInicio, fechaFin)
}

// Actualizar un evento
export async function updateAgendaEvento(id: string, formData: FormData) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Usuario no autenticado')
  }

  const evento: Partial<AgendaEventoInsert> = {
    titulo: formData.get('titulo') as string,
    fecha_inicio: formData.get('fecha_inicio') as string,
    hora_inicio: formData.get('hora_inicio') as string,
    fecha_fin: formData.get('fecha_fin') as string || undefined,
    hora_fin: formData.get('hora_fin') as string || undefined,
    color: formData.get('color') as 'blanco' | 'negro' | 'gris' | 'grisClaro',
    descripcion: formData.get('descripcion') as string || undefined,
  }

  const supabaseClient = supabase as any
  const { data, error } = await supabaseClient
    .from('agenda_eventos')
    .update(evento)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error actualizando evento:', error)
    throw new Error(error.message)
  }

  return data
}

// Eliminar un evento (soft delete)
export async function deleteAgendaEvento(id: string) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Usuario no autenticado')
  }

  const supabaseClient = supabase as any
  const { error } = await supabaseClient
    .from('agenda_eventos')
    .update({ activo: false })
    .eq('id', id)

  if (error) {
    console.error('Error eliminando evento:', error)
    throw new Error(error.message)
  }

  return true
}

// Eliminar un evento permanentemente
export async function deleteAgendaEventoPermanente(id: string) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Usuario no autenticado')
  }

  const { error } = await supabase
    .from('agenda_eventos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error eliminando evento permanentemente:', error)
    throw new Error(error.message)
  }

  return true
}