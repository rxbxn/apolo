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
import { useEsSuperAdmin } from "@/lib/hooks/use-es-super-admin"

import { FotoPerfilUpload } from "./foto-perfil-upload"
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
  fecha_registro: z.string().nullable().optional(),
  nombres: z.string().nullable().optional(),
  apellidos: z.string().nullable().optional(),
  tipo_documento: z.string().nullable().optional(),
  numero_documento: z.string().nullable().optional(),
  fecha_nacimiento: z.string().nullable().optional(),
  genero: z.string().nullable().optional(),
  poblacion: z.string().nullable().optional(),
  verificacion_sticker: z.string().nullable().optional(),
  fecha_verificacion_sticker: z.string().nullable().optional(),
  observacion_verificacion_sticker: z.string().nullable().optional(),
  nombre_verificador: z.string().nullable().optional(),

  // Ubicación
  lugar_nacimiento: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  ciudad_id: z.string().nullable().optional(),
  localidad_id: z.string().nullable().optional(),
  barrio_id: z.string().nullable().optional(),
  ubicacion: z.string().nullable().optional(),

  // Contacto
  email: z.string().email("Email inválido").nullable().optional().or(z.literal("")),
  celular: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  telefono_fijo: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),

  // Datos Demográficos
  nivel_escolaridad: z.string().nullable().optional(),
  perfil_ocupacion: z.string().nullable().optional(),
  tipo_vivienda: z.string().nullable().optional(),
  talla_camisa: z.string().nullable().optional(),
  ideologia_politica: z.union([z.enum(['Izquierda', 'Centro', 'Derecha']), z.literal(''), z.null()]).optional(),
  tiene_hijos: z.boolean().default(false),
  numero_hijos: z.coerce.number().optional(),

  // Redes Sociales
  facebook: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),

  // Referencias
  referencia_seleccion: z.string().nullable().optional(),
  telefono_referencia: z.string().nullable().optional(),

  // Compromisos
  compromiso_cautivo: z.coerce.number().min(0).default(0),
  compromiso_impacto: z.coerce.number().min(0).default(0),
  compromiso_marketing: z.coerce.number().min(0).default(0),
  compromiso_difusion: z.coerce.number().min(0).default(0).or(z.string()),
  compromiso_proyecto: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
  // Estado
  estado: z.enum(['activo', 'inactivo', 'suspendido', 'Activo']).optional(),
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

// Los campos vacíos en la base real vienen como `null` (columna sin dato en
// Postgres). El schema de abajo usa z.string().optional() en casi todos los
// campos, y "optional" en zod solo acepta que el campo NO esté (undefined) —
// NO acepta null explícito. Eso es lo que causaba el error "Expected string,
// received null" bloqueando el guardado en registros viejos que tienen
// campos vacíos en la BD (ej. observación de sticker nunca diligenciada).
// Se normaliza null → valor vacío del tipo correcto ANTES de dárselo a
// react-hook-form, así ningún campo secundario vuelve a bloquear el guardado
// sin importar qué tan "sucio" venga el registro desde la base.
function limpiarValoresNulos(data: Record<string, any>): Record<string, any> {
  const limpio: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    limpio[key] = value === null ? "" : value
  }
  // Campos que no son texto: si vinieron null (quedaron en "" arriba), se
  // corrigen al tipo/valor por defecto que sí espera el schema.
  if (limpio.tiene_hijos === "") limpio.tiene_hijos = false
  if (limpio.numero_hijos === "") limpio.numero_hijos = undefined
  if (limpio.estado === "") limpio.estado = "activo"
  if (limpio.ideologia_politica === "") limpio.ideologia_politica = null
  for (const campo of ["compromiso_cautivo", "compromiso_impacto", "compromiso_marketing", "compromiso_difusion"]) {
    if (limpio[campo] === "") limpio[campo] = 0
  }
  return limpio
}

export function PersonaForm({ initialData, isEditing = false }: PersonaFormProps) {
  const router = useRouter()
  const { crear, actualizar } = usePersonas()
  const { usuario: usuarioActual } = useUsuario()
  const { esSuperAdmin } = useEsSuperAdmin()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const activeTab = SECTIONS[activeTabIndex].id

  const form = useForm<PersonaFormValues>({
    resolver: zodResolver(personaSchema),
    defaultValues: initialData
      ? limpiarValoresNulos(initialData)
      : {
          nombres: "",
          apellidos: "",
          tipo_documento: "Cédula",
          numero_documento: "",
          compromiso_cautivo: 0,
          compromiso_impacto: 0,
          compromiso_marketing: 0,
          compromiso_difusion: 0,
          estado: "activo",
          ideologia_politica: null,
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
        // El sistema solo maneja Cédula de Ciudadanía — se fuerza siempre,
        // incluso si el registro traía otro valor de antes de esta regla.
        tipo_documento: "Cédula",
        // Campos de auditoría
        actualizado_por: usuarioActual?.id,
      }

      // Compromisos viven en la tabla militantes, NO en usuarios — eliminar antes de guardar
      const compromisosMilitante = {
        compromiso_marketing:  personaData.compromiso_marketing  ?? 0,
        compromiso_cautivo:    personaData.compromiso_cautivo    ?? 0,
        compromiso_impacto:    personaData.compromiso_impacto    ?? 0,
        compromiso_difusion:   personaData.compromiso_difusion   ?? 0,
        compromiso_proyecto:   personaData.compromiso_proyecto   ?? "",
      }
      delete personaData.compromiso_marketing
      delete personaData.compromiso_cautivo
      delete personaData.compromiso_impacto
      delete personaData.compromiso_difusion
      delete personaData.compromiso_proyecto
      // tiene_hijos no es columna de DB — es solo UI
      delete personaData.tiene_hijos
      // ideologia_politica: "" → null (la columna tiene CHECK constraint)
      if (personaData.ideologia_politica === "" || personaData.ideologia_politica === "__none__") {
        personaData.ideologia_politica = null
      }

      if (isEditing && initialData?.id) {
        // Campos secundarios (observaciones, sticker) que NO deben bloquear
        // el guardado si algo falla con ellos — por ejemplo, si la columna
        // aún no existe en la BD real o el valor no pasa un constraint. Si el
        // update completo falla, se reintenta solo con los datos
        // principales (nombre, cédula, ubicación, etc.) para no perder ese
        // trabajo por un campo secundario problemático.
        const CAMPOS_SECUNDARIOS = [
          'observaciones',
          'observacion_verificacion_sticker',
          'verificacion_sticker',
          'fecha_verificacion_sticker',
          'nombre_verificador',
        ]

        try {
          await actualizar(initialData.id, personaData as any)
          toast.success("Persona actualizada correctamente")
        } catch (err: any) {
          const teniaSecundarios = CAMPOS_SECUNDARIOS.some((c) => personaData[c] !== undefined)
          if (!teniaSecundarios) throw err

          const personaDataSinSecundarios: any = { ...personaData }
          CAMPOS_SECUNDARIOS.forEach((c) => delete personaDataSinSecundarios[c])

          await actualizar(initialData.id, personaDataSinSecundarios)
          toast.warning(
            "Se guardaron los datos principales. Observaciones/sticker no se pudieron guardar — avisa a soporte."
          )
        }
        // After updating usuario, try to sync militante commitments if militante exists
        // Sincronizar compromisos en militantes
        try {
          const milRes = await fetch(`/api/militante/summary/${initialData.id}`)
          if (milRes.ok) {
            const mil = await milRes.json()
            if (mil) {
              await fetch('/api/militante', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: mil.id || mil.militante_id, ...compromisosMilitante }),
              })
            }
          }
        } catch (e) {
          console.debug('No se pudo sincronizar militante:', e)
        }
      } else {
        // Regla de negocio: si quien crea NO es Super Admin (ej. un
        // coordinador dando de alta a alguien de su equipo), la persona
        // queda inactiva hasta que un Super Admin la revise y active desde
        // el listado de Personas. Un Super Admin sí puede crearla ya activa
        // (o con el estado que haya elegido en el formulario).
        const estadoFinal = esSuperAdmin ? (data.estado || 'activo') : 'inactivo'
        await crear({
          ...personaData,
          creado_por: usuarioActual?.id,
          estado: estadoFinal,
        } as any)
        toast.success(
          esSuperAdmin
            ? "Persona creada correctamente"
            : "Persona creada correctamente — queda INACTIVA hasta que un Super Admin la active"
        )
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
      if (!usuarioId) return
      const res = await fetch(`/api/militante/summary/${usuarioId}`)
      if (res.ok) {
        const d = await res.json()
        setMilitanteSummary(d)
        setSummaryModalOpen(true)
      } else {
        setMilitanteSummary(null)
        setSummaryModalOpen(true)
      }
    } catch (e) {
      console.error(e)
      setMilitanteSummary(null)
      setSummaryModalOpen(true)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
       
          {isEditing && initialData?.id ? (
            <FotoPerfilUpload
              usuarioId={initialData.id}
              fotoActual={initialData.foto_perfil_url}
            />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Podrás subir la foto después de guardar por primera vez.
            </p>
          )}

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
