"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { Loader2, Save, ChevronLeft, ChevronRight } from "lucide-react"
import { Cloud, Edit3 } from 'lucide-react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { usePersonas } from "@/lib/hooks/use-personas"
import { useUsuario } from "@/lib/hooks/use-usuario"

import { DatosPersonalesSection } from "./form-sections/datos-personales"
import { UbicacionSection } from "./form-sections/ubicacion"
import { ContactoSection } from "./form-sections/contacto"
import { DatosDemograficosSection } from "./form-sections/datos-demograficos"
import { RedesSocialesSection } from "./form-sections/redes-sociales"
import { ReferenciasSection } from "./form-sections/referencias"
import { CompromisosSection } from "./form-sections/compromisos"

// Esquema de validación completo
const personaSchema = z.object({
  // Datos Personales
  nombres: z.string().optional(),
  apellidos: z.string().optional(),
  tipo_documento: z.string().optional(),
  numero_documento: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  genero: z.string().optional(),
  estado_civil: z.string().optional(),

  // Ubicación
  direccion: z.string().optional(),
  ciudad_id: z.string().optional(),
  localidad_id: z.string().optional(),
  barrio_id: z.string().optional(),
  zona_id: z.string().optional(),
  ubicacion_manual: z.boolean().default(false),
  localidad_nombre: z.string().optional(),
  barrio_nombre: z.string().optional(),

  // Contacto
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  celular: z.string().optional(),
  telefono_fijo: z.string().optional(),
  whatsapp: z.string().optional(),

  // Datos Demográficos
  nivel_escolaridad: z.string().optional(),
  perfil_ocupacion: z.string().optional(),
  tipo_vivienda: z.string().optional(),
  estrato: z.string().optional(),
  ingresos_rango: z.string().optional(),
  tiene_hijos: z.boolean().default(false),
  numero_hijos: z.coerce.number().optional(),

  // Redes Sociales
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  tiktok: z.string().optional(),

  // Referencias
  referencia_id: z.string().optional(),
  tipo_referencia_id: z.string().optional(),
  lider_responsable: z.string().optional(),

  // Compromisos
  compromiso_cautivo: z.coerce.number().min(0).default(0),
  compromiso_impacto: z.coerce.number().min(0).default(0),
  compromiso_marketing: z.coerce.number().min(0).default(0),
  compromiso_id: z.string().optional(),
  observaciones: z.string().optional(),
  
  // Estado
  estado: z.enum(['activo', 'inactivo', 'suspendido']).optional(),
})

type PersonaFormValues = z.infer<typeof personaSchema>

interface PersonaFormProps {
  initialData?: any // Tipo Usuario de Supabase
  isEditing?: boolean
}

const SECTIONS = [
  { id: "datos-personales", label: "Datos Personales" },
  { id: "ubicacion", label: "Ubicación" },
  { id: "contacto", label: "Contacto" },
  { id: "demograficos", label: "Datos Demográficos" },
  { id: "redes", label: "Redes Sociales" },
  { id: "referencias", label: "Referencias" },
  { id: "compromisos", label: "Compromisos" },
]

export function PersonaForm({ initialData, isEditing = false }: PersonaFormProps) {
  const router = useRouter()
  const { crear, actualizar } = usePersonas()
  const { usuario: usuarioActual } = useUsuario()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const activeTab = SECTIONS[activeTabIndex].id

  const form = useForm<PersonaFormValues>({
    resolver: zodResolver(personaSchema),
    defaultValues: initialData || {
      // Datos Personales
      nombres: "",
      apellidos: "",
      tipo_documento: "Cédula",
      numero_documento: "",
      fecha_nacimiento: "",
      genero: "",
      estado_civil: "",
      
      // Ubicación
      direccion: "",
      ciudad_id: "",
      localidad_id: "",
      barrio_id: "",
      zona_id: "",
      ubicacion_manual: false,
      localidad_nombre: "",
      barrio_nombre: "",
      
      // Contacto
      email: "",
      celular: "",
      telefono_fijo: "",
      whatsapp: "",
      
      // Datos Demográficos
      nivel_escolaridad: "",
      perfil_ocupacion: "",
      tipo_vivienda: "",
      estrato: "",
      ingresos_rango: "",
      tiene_hijos: false,
      numero_hijos: 0,
      
      // Redes Sociales
      facebook: "",
      instagram: "",
      twitter: "",
      linkedin: "",
      tiktok: "",
      
      // Referencias
      referencia_id: "",
      tipo_referencia_id: "",
      lider_responsable: "",
      
      // Compromisos
      compromiso_cautivo: 0,
      compromiso_impacto: 0,
      compromiso_marketing: 0,
      compromiso_id: "",
      observaciones: "",
      
      // Estado
      estado: "activo",
    },
  })

  const handleNext = () => {
    if (activeTabIndex < SECTIONS.length - 1) {
      setActiveTabIndex(activeTabIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (activeTabIndex > 0) {
      setActiveTabIndex(activeTabIndex - 1)
    }
  }

  async function onSubmit(data: PersonaFormValues) {
    try {
      setIsSubmitting(true)

      // Preparar datos para enviar
      const personaData: any = {
        ...data,
        // Campos de auditoría
        actualizado_por: usuarioActual?.id,
      }

      // Some form fields (compromiso_id, referencia_id) are UI-only and may not exist
      // in the usuarios table in the DB schema. Remove them from the payload to avoid
      // Supabase schema/cache errors. The numeric compromiso_* fields are persisted.
      if (personaData.compromiso_id !== undefined) delete personaData.compromiso_id
      if (personaData.referencia_id !== undefined) delete personaData.referencia_id

      if (isEditing && initialData?.id) {
        await actualizar(initialData.id, personaData as any)
        toast.success("Persona actualizada correctamente")
        // After updating usuario, try to sync militante commitments if militante exists
        try {
          const milRes = await fetch(`/api/militante/summary/${initialData.id}`)
          if (milRes.ok) {
            const mil = await milRes.json()
            if (mil) {
              // Send PATCH to ensure militante row is synced from usuario
              await fetch('/api/militante', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: mil.id || mil.militante_id, compromiso_marketing: data.compromiso_marketing, compromiso_cautivo: data.compromiso_cautivo, compromiso_impacto: data.compromiso_impacto }),
              })
            }
          }
        } catch (e) {
          // Error sincronizando militante - continuar sin mostrar error al usuario
        }
      } else {
        await crear({
          ...personaData,
          creado_por: usuarioActual?.id,
          estado: data.estado || 'activo',
        } as any)
        toast.success("Persona creada correctamente")
        // When creating persona, we might also want to sync militante if exists - try
        try {
          const milRes = await fetch(`/api/militante/summary/${initialData?.id}`)
          if (milRes.ok) {
            const mil = await milRes.json()
            if (mil) {
              await fetch('/api/militante', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: mil.id || mil.militante_id, compromiso_marketing: data.compromiso_marketing, compromiso_cautivo: data.compromiso_cautivo, compromiso_impacto: data.compromiso_impacto }),
              })
            }
          }
        } catch (e) {
          // Error sincronizando militante - continuar sin mostrar error al usuario
        }
      }

      router.push("/dashboard/personas")
      router.refresh()
      } catch (error: any) {
      console.error("Error al guardar persona:", error)
      const msg = error?.message || String(error) || "Error al guardar la persona"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Observación cuando inactivo
  const [obsModalOpen, setObsModalOpen] = useState(false)
  const [obsValue, setObsValue] = useState('')

  async function saveObservation() {
    try {
      if (!form.getValues('numero_documento') && !initialData?.id) return
      const usuarioId = initialData?.id || null
      if (!usuarioId) return
      await actualizar(usuarioId, { observaciones: obsValue })
      setObsModalOpen(false)
      toast.success('Observación guardada')
    } catch (e) {
      toast.error('Error guardando observación')
    }
  }

  // Lápiz amarillo: mostrar resumen militante
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)
  const [militanteSummary, setMilitanteSummary] = useState<any>(null)

  async function openSummary() {
    try {
      const usuarioId = initialData?.id
      if (!usuarioId) {
        console.error('No hay usuarioId en initialData:', initialData)
        return
      }
      
      console.log('🔍 Buscando militante para usuario:', usuarioId)
      console.log('📝 Datos iniciales:', initialData)
      
      const res = await fetch(`/api/militante/summary/${usuarioId}`)
      console.log('📡 Respuesta API:', { status: res.status, ok: res.ok })
      
      if (res.ok) {
        const d = await res.json()
        console.log('✅ Datos de militante encontrados:', d)
        setMilitanteSummary(d)
        setSummaryModalOpen(true)
      } else {
        const errorText = await res.text()
        console.log('❌ Error en respuesta API:', errorText)
        setMilitanteSummary(null)
        setSummaryModalOpen(true)
      }
    } catch (e) {
      console.error('💥 Error en openSummary:', e)
      setMilitanteSummary(null)
      setSummaryModalOpen(true)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
       
          <h2 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Editar Persona" : "Nueva Persona"}
          </h2>
          <div className="flex gap-2 items-center">
            {form.watch('estado') === 'inactivo' && (
              <>
                <button type="button" className="text-muted-foreground" onClick={() => setObsModalOpen(true)} title="Agregar observación">
                  <Cloud className="h-5 w-5 text-sky-500" />
                </button>
              </>
            )}
         
            <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Guardar
            </Button>
          </div>
        </div>
          {/* Observation modal */}
          <Dialog open={obsModalOpen} onOpenChange={setObsModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar observación (usuario inactivo)</DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                <Textarea value={obsValue} onChange={(e) => setObsValue((e.target as HTMLTextAreaElement).value)} />
                <div className="flex justify-end mt-2">
                  <Button variant="outline" onClick={() => setObsModalOpen(false)}>Cerrar</Button>
                  <Button className="ml-2" onClick={saveObservation}>Guardar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Summary modal */}
          <Dialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resumen Militante</DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                {militanteSummary ? (
                  <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(militanteSummary, null, 2)}</pre>
                ) : (
                  <div className="text-sm text-muted-foreground">No hay información de militancia para este usuario.</div>
                )}
                <div className="flex justify-end mt-2">
                  <Button onClick={() => setSummaryModalOpen(false)}>Cerrar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Navegación lateral de secciones */}
          <div className="md:col-span-3 space-y-2">
            <Card>
              <CardContent className="p-2">
                <nav className="flex flex-col space-y-1">
                  {SECTIONS.map((item, index) => (
                    <Button
                      key={item.id}
                      variant={activeTab === item.id ? "secondary" : "ghost"}
                      className="justify-start w-full"
                      onClick={() => setActiveTabIndex(index)}
                      type="button"
                    >
                      {item.label}
                    </Button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Contenido del formulario */}
          <div className="md:col-span-9 space-y-6">
            <Card>
              <CardContent className="p-6">
                {/* Aquí irán los componentes de cada sección */}
                <div className={activeTab === "datos-personales" ? "block" : "hidden"}>
                  <h3 className="text-lg font-medium mb-4">Datos Personales</h3>
                  <DatosPersonalesSection form={form} />
                </div>

                <div className={activeTab === "ubicacion" ? "block" : "hidden"}>
                  <h3 className="text-lg font-medium mb-4">Ubicación</h3>
                  <UbicacionSection form={form} />
                </div>

                <div className={activeTab === "contacto" ? "block" : "hidden"}>
                  <h3 className="text-lg font-medium mb-4">Información de Contacto</h3>
                  <ContactoSection form={form} />
                </div>

                <div className={activeTab === "demograficos" ? "block" : "hidden"}>
                  <h3 className="text-lg font-medium mb-4">Datos Demográficos</h3>
                  <DatosDemograficosSection form={form} />
                </div>

                <div className={activeTab === "redes" ? "block" : "hidden"}>
                  <h3 className="text-lg font-medium mb-4">Redes Sociales</h3>
                  <RedesSocialesSection form={form} />
                </div>

                <div className={activeTab === "referencias" ? "block" : "hidden"}>
                  <h3 className="text-lg font-medium mb-4">Referencias</h3>
                  <ReferenciasSection form={form} />
                </div>

                <div className={activeTab === "compromisos" ? "block" : "hidden"}>
                  <h3 className="text-lg font-medium mb-4">Compromisos y Observaciones</h3>
                  <CompromisosSection form={form} />
                </div>

                {/* Botones de navegación */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={activeTabIndex === 0}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    {activeTabIndex + 1} de {SECTIONS.length}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNext}
                    disabled={activeTabIndex === SECTIONS.length - 1}
                  >
                    Siguiente
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          
       
          </div>
        
        </div>
      </form>
    </Form>
                  
  
  )
}
