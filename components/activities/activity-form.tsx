'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createActivity, updateActivity } from '@/lib/actions/activities'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'

const formSchema = z.object({
  nombre: z.string().min(2, {
    message: 'El nombre debe tener al menos 2 caracteres.',
  }),
  estado: z.enum(['vigente', 'no_vigente'], {
    required_error: 'Por favor selecciona un estado.',
  }),
})

interface ActivityFormProps {
  activity?: {
    id: string
    nombre: string
    estado: 'vigente' | 'no_vigente'
  }
  trigger?: React.ReactNode
}

export function ActivityForm({ activity, trigger }: ActivityFormProps) {
  const [open, setOpen] = useState(false)
  const isEditing = !!activity

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: activity?.nombre || '',
      estado: activity?.estado || 'vigente',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const formData = new FormData()
      formData.append('nombre', values.nombre)
      formData.append('estado', values.estado)

      if (isEditing && activity) {
        await updateActivity(activity.id, formData)
        toast.success('Actividad actualizada correctamente')
      } else {
        await createActivity(formData)
        toast.success('Actividad creada correctamente')
      }
      setOpen(false)
      form.reset()
    } catch (error) {
      toast.error('Ocurrió un error al guardar la actividad')
      console.error(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nueva Actividad
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Actividad' : 'Nueva Actividad'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los detalles de la actividad aquí.'
              : 'Ingresa los detalles de la nueva actividad.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Actividad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Campaña de Salud" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="vigente">Vigente</SelectItem>
                      <SelectItem value="no_vigente">No Vigente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
