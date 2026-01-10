import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Plus, Search, Calendar, User, Users, Eye } from "lucide-react"
import Link from "next/link"
import { getGestiones } from "@/lib/actions/gestion"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

export const metadata = {
    title: "Gestión Gerencial - APOLO",
    description: "Módulo de gestión y compromisos",
}

export default async function GestionGerencialPage() {
    const gestiones = await getGestiones()

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <Card className="p-6">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="No. Formulario o Nombre" className="pl-8" />
                        </div>
                        <Link href="/dashboard/gestion-gerencial/nuevo">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Formato
                            </Button>
                        </Link>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px] font-bold text-gray-600">No.</TableHead>
                                    <TableHead className="font-bold text-gray-600">
                                        <div className="flex items-center gap-2">
                                            Fecha <Calendar className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-bold text-gray-600">
                                        <div className="flex items-center gap-2">
                                            Nombre <User className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-bold text-gray-600">
                                        <div className="flex items-center gap-2">
                                            Gestor asignado <Users className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-bold text-gray-600">
                                        <div className="flex items-center gap-2">
                                            Estado <Eye className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {gestiones.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center bg-gray-50 text-gray-500">
                                            No hay formatos de gestión y compromisos.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    gestiones.map((gestion: any) => (
                                        <TableRow key={gestion.id} className="hover:bg-gray-50">
                                            <TableCell className="font-medium">{gestion.numero_formulario}</TableCell>
                                            <TableCell>{new Date(gestion.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>{gestion.militante}</TableCell>
                                            <TableCell>{gestion.gestor_asignado || '-'}</TableCell>
                                            <TableCell>
                                                <Link href={`/dashboard/gestion-gerencial/${gestion.id}`}>
                                                    <Badge variant={gestion.prioridad === 'Alta' ? 'destructive' : 'secondary'} className="cursor-pointer">
                                                        {gestion.prioridad || 'Ver'}
                                                    </Badge>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    )
}
