#!/usr/bin/env python3
"""
Aplica la migración: agrega columna ideologia_politica a la tabla usuarios.
Ejecutar una sola vez desde la carpeta cambios/.
"""
import subprocess, sys

for pkg in ["requests"]:
    try: __import__(pkg)
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", pkg,
                        "--break-system-packages", "-q"])

import requests
requests.packages.urllib3.disable_warnings()

SUPABASE_URL = "https://72-61-64-225.sslip.io"
SERVICE_KEY  = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjgyODA0MDAsImV4cCI6MTkyNjA0NjgwMH0"
    ".fJECVtt8vSKe5rN3tycLtn87Ql8PY5673sQYsXg4iuA"
)

H = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

SQL = """
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ideologia_politica TEXT
    CHECK (ideologia_politica IN ('Izquierda', 'Centro', 'Derecha'));

COMMENT ON COLUMN usuarios.ideologia_politica IS 'Orientación política declarada: Izquierda, Centro o Derecha';
"""

print()
print("=" * 60)
print("  MIGRACIÓN: ideologia_politica en tabla usuarios")
print("=" * 60)

print("\n🔌 Conectando a Supabase...")
r = requests.post(
    f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
    json={"query": SQL},
    headers=H,
    verify=False,
    timeout=20,
)

# Intentar vía pg-meta si exec_sql no existe
if r.status_code == 404:
    print("  ℹ️  exec_sql no disponible, intentando vía pg-meta...")
    r2 = requests.post(
        f"{SUPABASE_URL}/pg/query",
        json={"query": SQL},
        headers=H,
        verify=False,
        timeout=20,
    )
    if r2.status_code in (200, 201, 204):
        print("  ✅ Columna agregada correctamente vía pg-meta")
        sys.exit(0)
    else:
        print(f"  ⚠️  pg-meta: {r2.status_code} — {r2.text[:200]}")

if r.status_code in (200, 201, 204):
    print("  ✅ Columna ideologia_politica agregada correctamente")
else:
    print(f"  ⚠️  HTTP {r.status_code}: {r.text[:300]}")
    print()
    print("  👉 Si el error es 'column already exists', ya está aplicada. OK.")
    print("  👉 Si no, ejecuta manualmente en el SQL editor de Supabase:")
    print()
    print(SQL)

print()
print("  Verifica en Supabase → Table Editor → usuarios → columna ideologia_politica")
print("=" * 60)
