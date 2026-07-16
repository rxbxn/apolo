import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/admin/reset-personas
// Vacía el NÚCLEO de datos de Personas para volver a subir todo desde cero
// con el Excel de Importar/Exportar: usuarios, militantes, coordinadores,
// dirigentes y referencia. Operación destructiva e irreversible — el botón
// en Configuración exige confirmación antes de llamar este endpoint.
//
// PROTECCIÓN DE SUPER ADMIN: la primera vez que se usó este endpoint borró
// también la fila del admin logueado (su propio `usuarios`, vinculado por
// auth_user_id) y su asignación en `usuario_perfil`, dejando a TODA la app
// bloqueada con "No tienes permisos" hasta correr un script SQL manual de
// recuperación. Para que no vuelva a pasar: antes de borrar nada se detecta
// quién tiene una asignación activa a un perfil "Super Admin" (misma
// definición que usa lib/supabase/permissions.ts para dar acceso total) y
// esos usuarios — junto con su fila en usuario_perfil, su credencial, y su
// fila de coordinador/dirigente si la tuvieran — quedan excluidos de todo
// el borrado.
//
// Alcance explícitamente NO incluido (decisión del usuario): no se tocan
// las cuentas de Supabase Auth de los coordinadores eliminados (quedan
// huérfanas, se pueden limpiar aparte si hace falta), ni los registros de
// Debate (planillas, casa estratégica, vehículos, publicidad) — esas tablas
// no tienen FK real en producción así que no bloquean este borrado, pero
// quedarán con ids sueltos apuntando a coordinadores/militantes borrados.
//
// Orden pensado para respetar dependencias sin asumir que las FKs en cascada
// de schema_apolo_v2.sql ya estén desplegadas en producción tal cual: se
// borra explícitamente cada tabla, de hijos a padres, y `referencia` al
// final porque `usuarios.referencia_id` apunta hacia ella.
export async function POST() {
    const adminClient = createAdminClient() as any
    const resumen: Record<string, { eliminados: number | null; error: string | null; protegidos?: number }> = {}

    // ── 1. Detectar Super Admin(es) ANTES de borrar nada ──────────────────
    const { data: perfilesSuperAdmin } = await adminClient
        .from('perfiles')
        .select('id')
        .ilike('nombre', 'Super Admin')
    const perfilIds: string[] = (perfilesSuperAdmin ?? []).map((p: any) => p.id).filter(Boolean)

    let usuariosProtegidos: string[] = []
    if (perfilIds.length > 0) {
        const { data: asignaciones } = await adminClient
            .from('usuario_perfil')
            .select('usuario_id')
            .in('perfil_id', perfilIds)
            .eq('activo', true)
        usuariosProtegidos = [...new Set((asignaciones ?? []).map((a: any) => a.usuario_id).filter(Boolean))] as string[]
    }

    // Si el Super Admin también tiene fila de coordinador, protegerla (y
    // cualquier vínculo de dirigentes que dependa de esa fila).
    let coordinadoresProtegidos: string[] = []
    if (usuariosProtegidos.length > 0) {
        const { data: coordsAdmin } = await adminClient
            .from('coordinadores')
            .select('id')
            .in('usuario_id', usuariosProtegidos)
        coordinadoresProtegidos = (coordsAdmin ?? []).map((c: any) => c.id).filter(Boolean)
    }

    let dirigentesProtegidos: string[] = []
    if (coordinadoresProtegidos.length > 0) {
        const { data: dirRows } = await adminClient
            .from('dirigentes')
            .select('id, id_dirigente, id_coordinador')
        dirigentesProtegidos = (dirRows ?? [])
            .filter((d: any) => coordinadoresProtegidos.includes(d.id_dirigente) || coordinadoresProtegidos.includes(d.id_coordinador))
            .map((d: any) => d.id)
    }

    // ── 2. Borrar, excluyendo lo protegido ─────────────────────────────────
    async function borrarTodo(
        tabla: string,
        opts: { columnaId?: string; excluirColumna?: string; excluirIds?: string[] } = {}
    ) {
        const { columnaId = 'id', excluirColumna, excluirIds } = opts
        let query = adminClient.from(tabla).delete({ count: 'exact' }).not(columnaId, 'is', null)
        if (excluirColumna && excluirIds && excluirIds.length > 0) {
            query = query.not(excluirColumna, 'in', `(${excluirIds.join(',')})`)
        }
        const { error, count } = await query
        resumen[tabla] = {
            eliminados: error ? null : (count ?? 0),
            error: error?.message ?? null,
            ...(excluirIds && excluirIds.length > 0 ? { protegidos: excluirIds.length } : {}),
        }
    }

    await borrarTodo('usuario_perfil', { excluirColumna: 'usuario_id', excluirIds: usuariosProtegidos })
    await borrarTodo('credenciales', { excluirColumna: 'usuario_id', excluirIds: usuariosProtegidos })
    await borrarTodo('militantes', { excluirColumna: 'usuario_id', excluirIds: usuariosProtegidos })
    await borrarTodo('dirigentes', { excluirColumna: 'id', excluirIds: dirigentesProtegidos })
    await borrarTodo('coordinadores', { excluirColumna: 'usuario_id', excluirIds: usuariosProtegidos })
    await borrarTodo('usuarios', { excluirColumna: 'id', excluirIds: usuariosProtegidos })
    await borrarTodo('referencia')

    const huboErrores = Object.values(resumen).some((r) => r.error)
    return NextResponse.json({ resumen, protegidos: usuariosProtegidos.length, ok: !huboErrores })
}
