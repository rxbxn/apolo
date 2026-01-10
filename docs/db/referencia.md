# Tabla: referencia

Origen: consultado por MCP (mcp_supabase-apol_get_columns)

Columnas:

- id: uuid, NOT NULL — clave primaria (gen_random_uuid())
- created_at: timestamp with time zone, NOT NULL — default now()
- nombre: text, NULL
- telefono: text, NULL
- ciudad: uuid, NULL — referencia a `ciudades` (si aplica)

Descripción:
Tabla para almacenar referencias personales (nombre, teléfono y ciudad opcional).
