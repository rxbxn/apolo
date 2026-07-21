// Helper compartido para buscar por nombre cuando el nombre vive partido en
// dos columnas (`nombres` + `apellidos`).
//
// El bug que esto corrige: el patrón viejo, repetido en varios módulos, era
//   query.or(`nombres.ilike.%${busqueda}%,apellidos.ilike.%${busqueda}%`)
// que compara el TEXTO COMPLETO escrito contra CADA columna por separado.
// Si el usuario escribe el nombre completo ("LEONOR MARIA PELUFO ARRIETA"),
// ni `nombres` (solo "LEONOR MARIA") ni `apellidos` (solo "PELUFO ARRIETA")
// contienen ese texto completo — ninguno matchea, y la búsqueda no
// encuentra a alguien que sí existe. Solo funcionaba buscando una parte del
// nombre que cupiera entera en una sola columna.
//
// La solución: si el término de búsqueda trae más de una palabra, se busca
// CADA palabra por separado contra (nombres O apellidos), exigiendo que
// TODAS las palabras aparezcan en alguna de las dos columnas — sin importar
// en cuál caiga cada una. Postgres/PostgREST ya AND-ea automáticamente
// múltiples .or() encadenados en la misma query, así que no hace falta SQL
// crudo.
//
// Búsquedas de una sola palabra (o vacías) se comportan exactamente igual
// que antes — cero riesgo de regresión ahí.
export function aplicarBusquedaPorNombre<T>(
    query: T,
    busqueda: string,
    camposExtra: string[] = ['numero_documento'],
): T {
    const termino = busqueda.trim().replace(/\s+/g, ' ')
    if (!termino) return query

    const palabras = termino.split(' ')

    if (palabras.length <= 1) {
        const condiciones = ['nombres', 'apellidos', ...camposExtra]
            .map((campo) => `${campo}.ilike.%${termino}%`)
            .join(',')
        return (query as any).or(condiciones)
    }

    // Multi-palabra: se asume búsqueda por nombre completo — no tiene
    // sentido partir un número de cédula o un email en palabras, así que
    // camposExtra no entra en esta rama.
    let q: any = query
    for (const palabra of palabras) {
        q = q.or(`nombres.ilike.%${palabra}%,apellidos.ilike.%${palabra}%`)
    }
    return q
}
