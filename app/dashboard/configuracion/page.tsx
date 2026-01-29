import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { TiposMilitanteForm } from "@/components/configuracion/tipos-militante-form";
import { CiudadesManager } from "@/components/configuracion/lugares/ciudades-manager";
import { BarriosManager } from "@/components/configuracion/lugares/barrios-manager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, MapPin, Building2, Users, Trees, Link } from "lucide-react";
import { getCiudades, getBarrios, getGrupoEtnicos, getReferencias, getcompromiso, getCatalogoGestion } from "@/lib/actions/configuracion";
import { GrupoEtnicoManager } from "@/components/configuracion/grupo-etnico-manager";
import { ReferenciasCompromisosManager } from "@/components/configuracion/referencias-compromisos-manager";
import { ElementosManager } from "@/components/configuracion/elementos-manager";

export default async function ConfiguracionPage({ searchParams }: { searchParams?: any }) {
    // `searchParams` puede ser una Promise en Next.js App Router; unwrapearla antes de usar
    const resolvedSearchParams = await searchParams
    const ciudades = await getCiudades()
    const barrios = await getBarrios()
    const grupos = await getGrupoEtnicos()
    const referencias = await getReferencias()
    const compromisos = await getcompromiso()
    const elementos = await getCatalogoGestion()

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Configuración</h1>
                    <Settings className="h-6 w-6 text-muted-foreground" />
                </div>

                <Tabs defaultValue={resolvedSearchParams?.tab || "tipos"} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="tipos" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Tipos de Militante
                        </TabsTrigger>
                        <TabsTrigger value="ciudades" className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Ciudades
                        </TabsTrigger>
                        <TabsTrigger value="barrios" className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Barrios
                        </TabsTrigger>
                        <TabsTrigger value="grupos" className="flex items-center gap-2">
                            <Trees className="h-4 w-4" />
                            Grupos Étnicos
                        </TabsTrigger>
                        <TabsTrigger value="referencias" className="flex items-center gap-2">
                            <Link className="h-4 w-4" />
                            Referencias & Compromisos
                        </TabsTrigger>
                        <TabsTrigger value="elementos" className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Elementos Gestión
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tipos">
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

                    <TabsContent value="ciudades">
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

                    <TabsContent value="barrios">
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

                    <TabsContent value="grupos">
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

                    <TabsContent value="referencias">
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
                    <TabsContent value="elementos">
                        <Card>
                            <CardHeader>
                                <CardTitle>Elementos Gestión</CardTitle>
                                <CardDescription>
                                    Administrar los elementos que aparecerán en los select del formulario de gestión.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ElementosManager initialElementos={elementos} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
