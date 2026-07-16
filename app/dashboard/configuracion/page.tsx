import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { TiposMilitanteForm } from "@/components/configuracion/tipos-militante-form";
import { CiudadesManager } from "@/components/configuracion/lugares/ciudades-manager";
import { BarriosManager } from "@/components/configuracion/lugares/barrios-manager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, MapPin, Building2, Users, Trees, Link, AlertOctagon, Wrench, ClipboardList } from "lucide-react";
import {
    getCiudades,
    getBarrios,
    getGrupoEtnicos,
    getReferencias,
    getcompromiso,
    getGestionElementos,
    getGestionUnidades,
    getGestionCategorias,
    getGestionSectores,
    createGestionElemento,
    updateGestionElemento,
    deleteGestionElemento,
    createGestionUnidad,
    updateGestionUnidad,
    deleteGestionUnidad,
    createGestionCategoria,
    updateGestionCategoria,
    deleteGestionCategoria,
    createGestionSector,
    updateGestionSector,
    deleteGestionSector,
} from "@/lib/actions/configuracion";
import { GrupoEtnicoManager } from "@/components/configuracion/grupo-etnico-manager";
import { ReferenciasCompromisosManager } from "@/components/configuracion/referencias-compromisos-manager";
import { SimpleCatalogoManager } from "@/components/configuracion/simple-catalogo-manager";
import { ResetDatosPersonas } from "@/components/configuracion/reset-datos";
import { FusionarPendientes } from "@/components/configuracion/fusionar-pendientes";

// Grupos de navegación del panel — antes era una sola fila de 8 tabs
// horizontal que se veía desordenada (se envolvía en varias líneas).
// Se reorganiza como una barra lateral vertical agrupada por tema.
const GRUPOS_NAV = [
    {
        titulo: "General",
        items: [
            { value: "tipos", label: "Tipos de Militante", icon: Users },
        ],
    },
    {
        titulo: "Ubicaciones",
        items: [
            { value: "ciudades", label: "Ciudades", icon: MapPin },
            { value: "barrios", label: "Barrios", icon: Building2 },
        ],
    },
    {
        titulo: "Personas",
        items: [
            { value: "grupos", label: "Grupos Étnicos", icon: Trees },
            { value: "referencias", label: "Referencias & Compromisos", icon: Link },
        ],
    },
    {
        titulo: "Gestión Gerencial",
        items: [
            { value: "gestion-catalogos", label: "Catálogos de Solicitudes", icon: ClipboardList },
        ],
    },
    {
        titulo: "Sistema",
        items: [
            { value: "mantenimiento", label: "Mantenimiento", icon: Wrench },
            { value: "reset", label: "Zona de Peligro", icon: AlertOctagon, destructive: true },
        ],
    },
]

export default async function ConfiguracionPage({ searchParams }: { searchParams?: any }) {
    // `searchParams` puede ser una Promise en Next.js App Router; unwrapearla antes de usar
    const resolvedSearchParams = await searchParams
    const [
        ciudades,
        barrios,
        grupos,
        referencias,
        compromisos,
        gestionElementos,
        gestionUnidades,
        gestionCategorias,
        gestionSectores,
    ] = await Promise.all([
        getCiudades(),
        getBarrios(),
        getGrupoEtnicos(),
        getReferencias(),
        getcompromiso(),
        getGestionElementos(),
        getGestionUnidades(),
        getGestionCategorias(),
        getGestionSectores(),
    ])

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Configuración</h1>
                    <Settings className="h-6 w-6 text-muted-foreground" />
                </div>

                <Tabs
                    defaultValue={resolvedSearchParams?.tab || "tipos"}
                    orientation="vertical"
                    className="flex-row items-start gap-6"
                >
                    <TabsList className="flex-col h-auto w-full max-w-[240px] shrink-0 items-stretch justify-start gap-0.5 bg-transparent p-0">
                        {GRUPOS_NAV.map((grupo) => (
                            <div key={grupo.titulo} className="mb-2">
                                <div className="px-2.5 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {grupo.titulo}
                                </div>
                                {grupo.items.map(({ value, label, icon: Icon, destructive }) => (
                                    <TabsTrigger
                                        key={value}
                                        value={value}
                                        className={
                                            "w-full justify-start gap-2 rounded-md px-2.5 py-2 text-sm font-medium " +
                                            "data-[state=active]:bg-muted data-[state=active]:shadow-none " +
                                            (destructive ? "text-destructive data-[state=active]:text-destructive" : "")
                                        }
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{label}</span>
                                    </TabsTrigger>
                                ))}
                            </div>
                        ))}
                    </TabsList>

                    <div className="min-w-0 flex-1">
                        <TabsContent value="tipos" className="mt-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Tipos de Militante</CardTitle>
                                    <CardDescription>
                                        Añadir nuevos tipos de militante al sistema.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <TiposMilitanteForm />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="ciudades" className="mt-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Gestión de Ciudades</CardTitle>
                                    <CardDescription>
                                        Administrar las ciudades disponibles en el sistema.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <CiudadesManager initialCiudades={ciudades} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="barrios" className="mt-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Gestión de Barrios</CardTitle>
                                    <CardDescription>
                                        Administrar los barrios y asociarlos a ciudades.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <BarriosManager initialBarrios={barrios} ciudades={ciudades} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="grupos" className="mt-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Grupos Étnicos</CardTitle>
                                    <CardDescription>
                                        Registrar y administrar grupos étnicos.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <GrupoEtnicoManager initialGrupos={grupos} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="referencias" className="mt-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Referencias y Compromisos</CardTitle>
                                    <CardDescription>
                                        Agregar o administrar referencias y compromisos.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ReferenciasCompromisosManager initialReferencias={referencias} initialCompromisos={compromisos} ciudades={ciudades} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="gestion-catalogos" className="mt-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Catálogos de Solicitudes</CardTitle>
                                    <CardDescription>
                                        Administrar los valores que aparecen en los selects de Elemento, Unidad,
                                        Categoría y Sector del formulario &quot;Nuevo&quot; de Gestión Gerencial.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SimpleCatalogoManager
                                            titulo="Elemento"
                                            descripcion="Ítems que se pueden solicitar."
                                            initialItems={gestionElementos}
                                            createAction={createGestionElemento}
                                            updateAction={updateGestionElemento}
                                            deleteAction={deleteGestionElemento}
                                        />
                                        <SimpleCatalogoManager
                                            titulo="Unidad"
                                            descripcion="Unidad de medida (Unidades, Cajas, etc.)."
                                            initialItems={gestionUnidades}
                                            createAction={createGestionUnidad}
                                            updateAction={updateGestionUnidad}
                                            deleteAction={deleteGestionUnidad}
                                        />
                                        <SimpleCatalogoManager
                                            titulo="Categoría"
                                            descripcion="Categoría del elemento."
                                            initialItems={gestionCategorias}
                                            createAction={createGestionCategoria}
                                            updateAction={updateGestionCategoria}
                                            deleteAction={deleteGestionCategoria}
                                        />
                                        <SimpleCatalogoManager
                                            titulo="Sector"
                                            descripcion="Sector responsable o destinatario."
                                            initialItems={gestionSectores}
                                            createAction={createGestionSector}
                                            updateAction={updateGestionSector}
                                            deleteAction={deleteGestionSector}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="mantenimiento" className="mt-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Mantenimiento</CardTitle>
                                    <CardDescription>
                                        Herramientas para corregir datos generados por el import masivo de Personas.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <FusionarPendientes />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="reset" className="mt-0">
                            <Card className="border-destructive/40">
                                <CardHeader>
                                    <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
                                    <CardDescription>
                                        Borrado masivo de datos. Úsalo solo para reiniciar el módulo de Personas antes de una recarga completa desde el Excel.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResetDatosPersonas />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
