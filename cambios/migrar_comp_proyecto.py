#!/usr/bin/env python3
"""
Migra comp_proyecto desde tabla 'persona' → tabla 'usuarios'
Join por cedula = numero_documento
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
BASE = f"{SUPABASE_URL}/rest/v1"
H = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

def get_all(table, params=""):
    results = []
    offset = 0
    limit = 1000
    while True:
        sep = "&" if params else ""
        r = requests.get(
            f"{BASE}/{table}?limit={limit}&offset={offset}{sep}{params}",
            headers=H, verify=False, timeout=30
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        results.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    return results

# ── 1. Verificar que la columna existe en usuarios ──────────────
print("🔍 Verificando columna comp_proyecto en usuarios...")
r = requests.get(f"{BASE}/usuarios?limit=1&select=comp_proyecto",
                 headers=H, verify=False, timeout=10)
if r.status_code != 200:
    print("❌ La columna comp_proyecto NO existe en la tabla usuarios.")
    print()
    print("   Ejecuta primero este SQL en Supabase Studio → SQL Editor:")
    print()
    print("   ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS comp_proyecto TEXT;")
    print()
    sys.exit(1)
print("  ✅ Columna existe\n")

# ── 2. Traer todos los registros de persona con comp_proyecto ───
print("📥 Leyendo tabla persona...")
personas = get_all("persona", "select=cedula,comp_proyecto&comp_proyecto=not.is.null")
personas = [p for p in personas if p.get("comp_proyecto","").strip()]
print(f"  → {len(personas)} registros con comp_proyecto en tabla persona\n")

if not personas:
    print("⚠️  No hay datos para migrar.")
    sys.exit(0)

def norm_cedula(v):
    """Normaliza cédula: quita decimales tipo '1123311535.0' → '1123311535'"""
    s = str(v).strip()
    try:
        return str(int(float(s)))
    except Exception:
        return s

# ── 3. Traer mapa numero_documento → id de usuarios ─────────────
print("📥 Leyendo usuarios (numero_documento → id)...")
usuarios = get_all("usuarios", "select=id,numero_documento,comp_proyecto")
# Doble índice: normalizado y raw por si acaso
uid_map = {}
for u in usuarios:
    raw = str(u["numero_documento"]).strip()
    uid_map[raw] = u
    uid_map[norm_cedula(raw)] = u
print(f"  → {len(usuarios)} usuarios en BD\n")

# ── 4. Actualizar usuarios uno a uno (PATCH) ────────────────────
print("🔄 Actualizando comp_proyecto en usuarios...")
ok = 0
skip = 0
no_match = 0

for p in personas:
    cedula_raw = str(p.get("cedula","")).strip()
    cedula     = norm_cedula(cedula_raw)
    valor      = str(p.get("comp_proyecto","")).strip()
    if not cedula or not valor:
        skip += 1
        continue

    usuario = uid_map.get(cedula) or uid_map.get(cedula_raw)
    if not usuario:
        no_match += 1
        continue

    # Si ya tiene el mismo valor, saltar
    if usuario.get("comp_proyecto") == valor:
        skip += 1
        continue

    uid = usuario["id"]
    r = requests.patch(
        f"{BASE}/usuarios?id=eq.{uid}",
        json={"comp_proyecto": valor},
        headers=H, verify=False, timeout=15
    )
    if r.status_code in (200, 204):
        ok += 1
    else:
        try:   print(f"  ❌ {cedula}: {r.json()}")
        except: print(f"  ❌ {cedula}: HTTP {r.status_code}")

print()
print(f"  ✅ Actualizados : {ok}")
print(f"  ⏭  Sin cambio   : {skip}")
print(f"  ⚠️  Sin match BD : {no_match}")
print("\n🏁 Listo.")
