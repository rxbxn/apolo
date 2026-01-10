Uso de MCP para investigar tablas

Si una acción server falla con un error indicando que una tabla no existe (p. ej. `relation "X" does not exist`), puedes usar las herramientas MCP para inspeccionar la base de datos remota desde este entorno de desarrollo:

- Listar tablas: mcp_supabase-apol_get_tables
- Ver columnas de una tabla: mcp_supabase-apol_get_columns (por ejemplo, `tableName: 'referencia'`)

Además, este repositorio contiene documentación básica de las tablas en `docs/db/` que se genera o actualiza con la información obtenida vía MCP.

Cómo actuar desde este repositorio (desarrollador):
1. Revisa `docs/db/<tabla>.md` para ver la estructura localmente documentada.
2. Si necesitas actualizar la documentación, pide al asistente que ejecute MCP para obtener la información actual y genere/actualice los archivos.

Si necesitas que el proyecto intente recuperar automáticamente la información vía MCP cuando una tabla no exista en tiempo de ejecución, házmelo saber y puedo añadir una ruta de desarrollo protegida que use el endpoint MCP para devolver metadata (solo para entornos de desarrollo).
