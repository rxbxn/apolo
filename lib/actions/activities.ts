'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Activity = {
    id: string
    nombre: string
    estado: 'vigente' | 'no_vigente'
    creado_en: string
}

import { cookies } from 'next/headers'

export async function getActivities() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from('actividades')
        .select('*')
        .order('creado_en', { ascending: false })

    if (error) {
        console.error('Error fetching activities:', error)
        throw new Error('Error al cargar las actividades')
    }

    return data as Activity[]
}

export async function createActivity(formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const nombre = formData.get('nombre') as string
    const estado = formData.get('estado') as 'vigente' | 'no_vigente'

    if (!nombre || !estado) {
        throw new Error('Nombre y estado son requeridos')
    }

    const { error } = await supabase
        .from('actividades')
        .insert([{ nombre, estado }])

    if (error) {
        console.error('Error creating activity:', error)
        throw new Error(error.message)
    }

    revalidatePath('/dashboard/activities')
}

export async function updateActivity(id: string, formData: FormData) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const nombre = formData.get('nombre') as string
    const estado = formData.get('estado') as 'vigente' | 'no_vigente'

    if (!nombre || !estado) {
        throw new Error('Nombre y estado son requeridos')
    }

    const { error } = await supabase
        .from('actividades')
        .update({ nombre, estado })
        .eq('id', id)

    if (error) {
        console.error('Error updating activity:', error)
        throw new Error(error.message)
    }

    revalidatePath('/dashboard/activities')
}

export async function deleteActivity(id: string) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { error } = await supabase
        .from('actividades')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting activity:', error)
        throw new Error(error.message)
    }

    revalidatePath('/dashboard/activities')
}
