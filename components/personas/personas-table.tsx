"use client"

import { useEffect, useState, ChangeEvent } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Edit, Trash2, Loader2, ChevronLeft, ChevronRight, Shield, Edit3, Cloud } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirm } from "@/lib/hooks/use-confirm"
import { usePersonas } from "@/lib/hooks/use-personas"
import { useTiposMilitante } from "@/lib/hooks/use-tipos-militante"
import { useMilitantes } from '@/lib/hooks/use-militantes'
import { useCatalogos } from "@/lib/hooks/use-catalogos"
import { usePermisos } from "@/lib/hooks/use-permisos"
import { toast } from "sonner"
import type { Database } from "@/lib/supabase/database.types"
import { PermisosModal } from "./permisos-modal"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

type Usuario = Database["public"]["Tables"]["usuarios"]["Row"] & {
  ciudades?: { nombre: string } | null
  zonas?: { nombre: string } | null
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    activo: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    inactivo: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
    suspendido: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  }
  return colors[status] || colors.inactivo
}

const getRowColor = (status: string) => {
  const colors: Record<string, string> = {
    activo: "border-b border-border hover:bg-muted/50 transition-colors",
    inactivo: "border-b border-border bg-gray-50 hover:bg-gray-100 transition-colors dark:bg-gray-900/30 dark:hover:bg-gray-800/50",
    suspendido: "border-b border-border bg-red-50 hover:bg-red-100 transition-colors dark:bg-red-950/30 dark:hover:bg-red-900/50",
  }
  return colors[status] || colors.activo
}

export function PersonasTable() {
  const router = useRouter()
  const { listar, eliminar, loading: personasLoading, cambiarEstado, actualizar, obtenerPorId: obtenerUsuarioPorId } = usePersonas()
  const { ciudades, zonas, loading: catalogosLoading } = useCatalogos()
  const { permisos } = usePermisos("Módulo Personas")
  const { confirm, isOpen, config, handleConfirm, handleCancel, setIsOpen } = useConfirm()

  const [personas, setPersonas] = useState<Usuario[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filtros
  const [search, setSearch] = useState("")
  const [estadoFilter, setEstadoFilter] = useState<string>("todos")
  const [ciudadFilter, setCiudadFilter] = useState<string>("todos")
  const [zonaFilter, setZonaFilter] = useState<string>("todos")

  // Estado para modal de permisos
  const [permisosModalOpen, setPermisosModalOpen] = useState(false)
  const [personaSeleccionada, setPersonaSeleccionada] = useState<Usuario | null>(null)

  // Estado para modal de imagen
  const [imagenModalOpen, setImagenModalOpen] = useState(false)
  const [imagenSeleccionadaUrl, setImagenSeleccionadaUrl] = useState<string | null>(null)
  // Summary modal for militant data
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)
  const [militanteSummary, setMilitanteSummary] = useState<any>(null)
  const [militanteModalOpen, setMilitanteModalOpen] = useState(false)
  const [militanteData, setMilitanteData] = useState<any>(null)
  const { actualizar: actualizarMilitante, obtenerPorId } = useMilitantes()
  const { listar: listarTiposMilitante } = useTiposMilitante()
  const [tiposMilitante, setTiposMilitante] = useState<any[]>([])

  // Cargar tipos de militante al montar para usar en el modal
  useEffect(() => {
    let mounted = true
    async function loadTipos() {
      try {
        const tipos = await listarTiposMilitante()
        if (mounted) setTiposMilitante(tipos || [])
      } catch (e) {
        console.warn('No se pudieron cargar tipos_militante:', e)
        if (mounted) setTiposMilitante([])
      }
    }
    loadTipos()
    return () => { mounted = false }
  }, [listarTiposMilitante])

  // Observaciones modal
  const [obsModalOpen, setObsModalOpen] = useState(false)
  const [obsValue, setObsValue] = useState("")
  const [obsUsuarioId, setObsUsuarioId] = useState<string | null>(null)

  const pageSize = 10

  useEffect(() => {
    cargarPersonas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, estadoFilter, ciudadFilter, zonaFilter])

  async function cargarPersonas() {
    try {
      const filtros: any = {}
      if (search) filtros.busqueda = search
      if (estadoFilter !== 'todos') filtros.estado = estadoFilter
      if (ciudadFilter !== 'todos') filtros.ciudad_id = ciudadFilter
      if (zonaFilter !== 'todos') filtros.zona_id = zonaFilter

      const result = await listar(filtros, currentPage, pageSize)
      setPersonas(result.data)
      setTotalCount(result.count)
      setTotalPages(result.totalPages)
    } catch (e) {
      console.error('Error cargando personas:', e)
      toast.error('Error al cargar personas')
    }
  }

  function handleAbrirPermisos(persona: Usuario) {
    setPersonaSeleccionada(persona)
    setPermisosModalOpen(true)
  }

  function handleAbrirImagen(url: string) {
    setImagenSeleccionadaUrl(url)
    setImagenModalOpen(true)
  }

  async function handleEliminar(id: string, nombre: string) {
    const confirmed = await confirm({
      title: "Eliminar Persona",
      description: `¿Estás seguro de eliminar a ${nombre}? Esta acción no se puede deshacer y eliminará todos los datos asociados.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive"
    })

    if (!confirmed) return

    try {
      await eliminar(id)
      toast.success('Persona eliminada exitosamente')
      cargarPersonas()
    } catch (e) {
      console.error('Error eliminando persona:', e)
      toast.error('Error al eliminar persona')
    }
  }


  const loading = personasLoading || catalogosLoading

  if (!permisos?.leer) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No tienes permisos para ver este módulo</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Dialog>
      <div className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, documento o email..."
              className="pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          <Select
            value={estadoFilter}
            onValueChange={(value) => {
              setEstadoFilter(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
              <SelectItem value="suspendido">Suspendido</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={ciudadFilter}
            onValueChange={(value) => {
              setCiudadFilter(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Ciudad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las ciudades</SelectItem>
              {ciudades.map((ciudad) => (
                <SelectItem key={ciudad.id} value={ciudad.id}>
                  {ciudad.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabla */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : personas.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No se encontraron personas
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                          Foto
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                          Documento
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                          Nombre
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                          Contacto
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                          Ciudad
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                          Zona
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                          Estado
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {personas.map((persona) => (
                        <tr
                          key={persona.id}
                          className={getRowColor(persona.estado)}
                        >
                          <td className="px-6 py-4">
                            {persona.foto_perfil_url ? (
                              <DialogTrigger asChild>
                                <button onClick={() => handleAbrirImagen(persona.foto_perfil_url!)}>
                                  <Image
                                    src={persona.foto_perfil_url}
                                    alt={`Foto de ${persona.nombres}`}
                                    width={40}
                                    height={40}
                                    className="rounded-full object-cover w-10 h-10 cursor-pointer"
                                  />
                                </button>
                              </DialogTrigger>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                                Sin foto
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            <div>{persona.tipo_documento}</div>
                            <div className="text-xs text-muted-foreground">
                              {persona.numero_documento}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            {persona.nombres} {persona.apellidos}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            <div>{persona.celular || "-"}</div>
                            <div className="text-xs">{persona.email || "-"}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            {persona.ciudades?.nombre || "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            {persona.zonas?.nombre || "-"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {permisos?.actualizar ? (
                                <Select
                                  value={persona.estado}
                                  onValueChange={async (value) => {
                                    try {
                                      if (!value) return
                                      await cambiarEstado(persona.id, value as any)
                                      // Optimistically update UI
                                      setPersonas((prev) => prev.map((p) => (p.id === persona.id ? { ...p, estado: value } : p)))
                                      toast.success('Estado actualizado')
                                    } catch (e) {
                                      console.error('Error cambiando estado:', e)
                                      toast.error('Error actualizando estado')
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-44">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="activo">Activo</SelectItem>
                                    <SelectItem value="inactivo">Inactivo</SelectItem>
                                    <SelectItem value="suspendido">Suspendido</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge className={getStatusColor(persona.estado)}>{persona.estado}</Badge>
                              )}

                              {/* Mostrar icono de globo si está inactivo */}
                              {persona.estado === 'inactivo' && (
                                <button
                                  type="button"
                                  className="text-muted-foreground"
                                  onClick={() => {
                                    setObsUsuarioId(persona.id)
                                    setObsValue(persona.observaciones || '')
                                    setObsModalOpen(true)
                                  }}
                                  title="Agregar observación"
                                >
                                  <Cloud className="h-5 w-5 text-sky-500" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {permisos?.actualizar && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => router.push(`/dashboard/personas/${persona.id}`)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {permisos?.administrar && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900"
                                  onClick={() => handleAbrirPermisos(persona)}
                                  title="Gestionar permisos"
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                              )}
                              {/* Editar militante: show yellow pencil and open summary modal */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900"
                                onClick={async () => {
                                  try {
                                    console.log('🔍 Clicking Edit3 button for persona:', persona.id)
                                    
                                    // Fetch militante record by usuario_id using existing API
                                    const res = await fetch(`/api/militante/summary/${persona.id}`)
                                    let d: any = null
                                    if (res.ok) {
                                      d = await res.json()
                                      console.log('✅ Militante summary fetched:', d)
                                    } else {
                                      console.warn('⚠️ No militante summary found or API error')
                                    }

                                    // Try to fetch usuario row to preload compromiso fields (usuarios wins over militantes)
                                    let usuarioRow: any = null
                                    try {
                                      console.log('🔍 Fetching usuario for preload compromisos...')
                                      // Use direct API call instead of hook to avoid Supabase client issues
                                      const usuarioRes = await fetch(`/api/personas/${persona.id}`)
                                      if (usuarioRes.ok) {
                                        usuarioRow = await usuarioRes.json()
                                        console.log('✅ Usuario fetched via API:', usuarioRow)
                                      } else {
                                        console.warn('⚠️ Usuario API call failed:', usuarioRes.status)
                                      }
                                    } catch (ue) {
                                      console.error('❌ Error fetching usuario for preload compromisos:', ue)
                                      // Continue without usuario data - don't break the flow
                                    }

                                    if (d) {
                                      // merge compromiso fields from usuario if present
                                      const merged = { ...(d || {}) }
                                      if (usuarioRow) {
                                        if (usuarioRow.compromiso_marketing !== undefined && usuarioRow.compromiso_marketing !== null) merged.compromiso_marketing = usuarioRow.compromiso_marketing
                                        if (usuarioRow.compromiso_cautivo !== undefined && usuarioRow.compromiso_cautivo !== null) merged.compromiso_cautivo = usuarioRow.compromiso_cautivo
                                        if (usuarioRow.compromiso_impacto !== undefined && usuarioRow.compromiso_impacto !== null) merged.compromiso_impacto = usuarioRow.compromiso_impacto
                                      }

                                      // Normalize tipo: API might return id, codigo or descripcion; prefer id from tiposMilitante
                                      if (merged.tipo && tiposMilitante.length > 0) {
                                        const foundById = tiposMilitante.find(t => t.id === merged.tipo)
                                        if (foundById) merged.tipo = foundById.id
                                        else {
                                          const foundByCodigo = tiposMilitante.find(t => String(t.codigo) === String(merged.tipo))
                                          if (foundByCodigo) merged.tipo = foundByCodigo.id
                                          else {
                                            const foundByDesc = tiposMilitante.find(t => String(t.descripcion) === String(merged.tipo))
                                            if (foundByDesc) merged.tipo = foundByDesc.id
                                          }
                                        }
                                      }

                                      console.log('✅ Setting militante data:', merged)
                                      setMilitanteData(merged)
                                      setMilitanteModalOpen(true)
                                    } else {
                                      // No militante for this usuario - but still preload usuario compromiso fields into modal
                                      const empty: any = { usuario_id: persona.id }
                                      if (usuarioRow) {
                                        empty.compromiso_marketing = usuarioRow.compromiso_marketing ?? null
                                        empty.compromiso_cautivo = usuarioRow.compromiso_cautivo ?? null
                                        empty.compromiso_impacto = usuarioRow.compromiso_impacto ?? null
                                      }

                                      // default tipo to empty string
                                      empty.tipo = ''

                                      console.log('✅ Setting empty militante data:', empty)
                                      setMilitanteData(empty)
                                      setMilitanteModalOpen(true)
                                    }
                                  } catch (e) {
                                    console.error('❌ Error fetching militante summary from table:', e)
                                    // Show error but still try to open modal with minimal data
                                    const fallbackData: any = { 
                                      usuario_id: persona.id, 
                                      tipo: '',
                                      error: 'Error cargando datos del militante'
                                    }
                                    setMilitanteData(fallbackData)
                                    setMilitanteModalOpen(true)
                                    
                                    // Show toast error
                                    toast.error('Error cargando datos del militante')
                                  }
                                }}
                                title="Ver/Editar datos de militante"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              {permisos?.eliminar && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 text-destructive hover:bg-destructive/10"
                                  onClick={() =>
                                    handleEliminar(
                                      persona.id,
                                      `${persona.nombres} ${persona.apellidos}`
                                    )
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * pageSize + 1} a{" "}
                    {Math.min(currentPage * pageSize, totalCount)} de {totalCount} personas
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Modal de permisos */}
        {personaSeleccionada && (
          <PermisosModal
            open={permisosModalOpen}
            onOpenChange={setPermisosModalOpen}
            persona={{
              id: personaSeleccionada.id,
              nombres: personaSeleccionada.nombres,
              apellidos: personaSeleccionada.apellidos,
            }}
          />
        )}
      </div>

      {/* Modal de Imagen */}
      <Dialog open={imagenModalOpen} onOpenChange={setImagenModalOpen}>
        <DialogContent className="max-w-xl">
          <VisuallyHidden>
            <DialogTitle>Imagen de Perfil</DialogTitle>
            <DialogDescription>
              Imagen de perfil ampliada.
            </DialogDescription>
          </VisuallyHidden>
          {imagenSeleccionadaUrl && (
            <Image
              src={imagenSeleccionadaUrl}
              alt="Foto de perfil ampliada"
              width={800}
              height={800}
              className="rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
      {/* Summary modal for militant */}
      <Dialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
        <DialogContent>
          <VisuallyHidden>
            <DialogTitle>Resumen de Militante</DialogTitle>
            <DialogDescription>Resumen de datos de militancia para este usuario.</DialogDescription>
          </VisuallyHidden>
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
      {/* Full Militante modal (editable) */}
      <Dialog open={militanteModalOpen} onOpenChange={setMilitanteModalOpen}>
        <DialogContent className="max-w-4xl">
          <div className="flex flex-col">
            <DialogTitle className="text-center text-3xl text-teal-700">Información Militante <span className="ml-2">👤➕</span></DialogTitle>

            <div className="p-6">
              {!militanteData ? (
                <div className="text-sm text-muted-foreground">Este usuario no tiene registro de militancia.</div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="mb-2 text-xs text-muted-foreground">Nombre</div>
                    <Input value={`${militanteData.nombres || ''} ${militanteData.apellidos || ''}`.trim()} readOnly />

                    <div className="mt-4 mb-2 text-xs text-muted-foreground">Número documento</div>
                    <Input value={militanteData.numero_documento || ''} readOnly />

                    <div className="mt-4 mb-2 text-xs text-muted-foreground">Coordinador</div>
                    <Input value={militanteData.coordinador_nombre || militanteData.coordinador_id || ''} onChange={(e) => setMilitanteData((s:any) => ({ ...s, coordinador_id: e.target.value }))} />

                    <div className="mt-4 mb-2 text-xs text-muted-foreground">Compromiso Marketing</div>
                    <Input value={militanteData.compromiso_marketing || ''} onChange={(e) => setMilitanteData((s:any) => ({ ...s, compromiso_marketing: e.target.value }))} />
                  </div>

                  <div>
                    <div className="mb-2 text-xs text-muted-foreground">Formulario</div>
                    <Input value={militanteData.formulario || ''} onChange={(e) => setMilitanteData((s:any) => ({ ...s, formulario: e.target.value }))} />

                    <div className="mt-4 mb-2 text-xs text-muted-foreground">Tipo Militante</div>
                    <Select value={militanteData.tipo || 'sin_tipo'} onValueChange={(val) => setMilitanteData((s:any) => ({ ...s, tipo: val === 'sin_tipo' ? null : val }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccione tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sin_tipo">Sin tipo</SelectItem>
                        {tiposMilitante.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.codigo ? `${t.codigo} - ${t.descripcion}` : t.descripcion}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="mt-4 mb-2 text-xs text-muted-foreground">Jefe de Debate</div>
                    <Input value={militanteData.jefe_debate || ''} onChange={(e) => setMilitanteData((s:any) => ({ ...s, jefe_debate: e.target.value }))} />

                    <div className="mt-4 mb-2 text-xs text-muted-foreground">Compromiso Cautivo</div>
                    <Input value={militanteData.compromiso_cautivo || ''} onChange={(e) => setMilitanteData((s:any) => ({ ...s, compromiso_cautivo: e.target.value }))} />

                    <div className="mt-4 mb-2 text-xs text-muted-foreground">Compromiso Impacto</div>
                    <Input value={militanteData.compromiso_impacto || ''} onChange={(e) => setMilitanteData((s:any) => ({ ...s, compromiso_impacto: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end items-center gap-4 px-6 pb-6">
              <Button variant="ghost" onClick={() => setMilitanteModalOpen(false)}>CANCELAR ✖</Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={async () => {
                try {
                  if (!militanteData) {
                    toast.error('No hay datos de militante para actualizar')
                    return
                  }
                  
                  const usuarioId = militanteData.usuario_id
                  if (!usuarioId) {
                    console.error('militanteData sin usuario_id:', militanteData)
                    toast.error('No se puede actualizar: falta el usuario_id del militante')
                    return
                  }
                  
                  console.log('🔄 Actualizando militante para usuario_id:', usuarioId)
                  console.log('📋 Datos a enviar:', militanteData)
                  
                  const payload: any = {
                    usuario_id: usuarioId, // ID del usuario para buscar el militante
                    tipo: militanteData.tipo,
                    coordinador_id: militanteData.coordinador_id,
                    compromiso_cautivo: militanteData.compromiso_cautivo,
                    compromiso_impacto: militanteData.compromiso_impacto,
                    compromiso_marketing: militanteData.compromiso_marketing,
                    formulario: militanteData.formulario,
                    perfil_id: militanteData.perfil_id,
                    estado: militanteData.estado,
                    jefe_debate: militanteData.jefe_debate,
                  }
                  // El hook espera un ID como primer parámetro, usamos el usuario_id
                  await actualizarMilitante(usuarioId, payload)
                  toast.success('Militante actualizado')
                  setMilitanteModalOpen(false)
                  cargarPersonas()
                } catch (e) {
                  console.error('Error actualizando militante:', e)
                  toast.error('Error actualizando militante')
                }
              }}>ACTUALIZAR</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Observaciones modal (para estado inactivo) */}
      <Dialog open={obsModalOpen} onOpenChange={setObsModalOpen}>
        <DialogContent>
          <DialogTitle>Agregar observación (usuario inactivo)</DialogTitle>
          <DialogDescription>Escribe el motivo por el cual el usuario está inactivo.</DialogDescription>
          <div className="mt-2">
            <Textarea value={obsValue} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setObsValue(e.target.value)} />
            <div className="flex justify-end mt-2">
              <Button variant="outline" onClick={() => setObsModalOpen(false)}>Cerrar</Button>
              <Button
                className="ml-2"
                onClick={async () => {
                  try {
                    if (!obsUsuarioId) return
                    await actualizar(obsUsuarioId, { observaciones: obsValue })
                    setObsModalOpen(false)
                    toast.success('Observación guardada')
                    // refresh list
                    cargarPersonas()
                  } catch (e) {
                    console.error('Error guardando observación:', e)
                    toast.error('Error guardando observación')
                  }
                }}
              >
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>

    {/* Modal de Confirmación */}
    {config && (
      <ConfirmDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={config.title}
        description={config.description}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
        variant={config.variant}
        onConfirm={handleConfirm}
      />
    )}
  </>
  )
}
