#!/usr/bin/env python3
"""
=============================================================
  PARCHE: Poblar militantes.dirigente_id desde el Excel
  No borra ni re-migra datos. Solo actualiza dirigente_id.
=============================================================
Lee la columna DIRIGENTE del Excel (primera ocurrencia),
la resuelve al coordinadores.id del dirigente, y hace PATCH
en la tabla militantes para cada registro que tenga un
dirigente asignado en el Excel pero dirigente_id = null en BD.
=============================================================
"""
import subprocess, sys, os, math, re as _re

for pkg in ["requests", "pandas", "openpyxl"]:
    try: __import__(pkg)
    except ImportError:
        print(f"📦 Instalando {pkg}...")
        subprocess.run([sys.executable, "-m", "pip", "install", pkg,
                        "--break-system-packages", "-q"])

import requests, pandas as pd
requests.packages.urllib3.disable_warnings()

# ── Configuración ──────────────────────────────────────────────
SUPABASE_URL = "https://72-61-64-225.sslip.io"
SERVICE_KEY  = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NjgyODA0MDAsImV4cCI6MTkyNjA0NjgwMH0"
    ".fJECVtt8vSKe5rN3tycLtn87Ql8PY5673sQYsXg4iuA"
)
EXCEL_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "Personas (78).xlsx")

H    = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json", "Prefer": "return=representation"}
HM   = {**H, "Prefer": "return=minimal"}
BASE = SUPABASE_URL + "/rest/v1"

def get_all(table, params=""):
    rows, offset = [], 0
    while True:
        r = requests.get(f"{BASE}/{table}?{params}&limit=1000&offset={offset}",
                         headers=H, verify=False, timeout=30)
        chunk = r.json() if r.status_code == 200 else []
        if not isinstance(chunk, list): break
        rows += chunk
        if len(chunk) < 1000: break
        offset += 1000
    return rows

def patch(table, filt, payload):
    r = requests.patch(f"{BASE}/{table}?{filt}", json=payload,
                       headers=HM, verify=False, timeout=15)
    return r.status_code

# ── Verificar conexión ─────────────────────────────────────────
print()
print("=" * 62)
print("  🔧  PARCHE: militantes.dirigente_id  desde Excel")
print("=" * 62)
print("\n🔌 Verificando conexión...")
try:
    r = requests.get(f"{BASE}/militantes?limit=1", headers=H, verify=False, timeout=10)
    if r.status_code not in (200, 406):
        print(f"  ❌ {r.status_code}: {r.text[:120]}"); sys.exit(1)
    print(f"  ✅ Conectado ({SUPABASE_URL})")
except Exception as e:
    print(f"  ❌ Sin conexión: {e}"); sys.exit(1)

# ── Leer Excel ─────────────────────────────────────────────────
print(f"\n📊 Cargando Excel: {EXCEL_FILE}")
df_raw = pd.read_excel(EXCEL_FILE)
df_raw.columns = [str(c).strip() for c in df_raw.columns]

# Manejar columna DIRIGENTE duplicada
cols = list(df_raw.columns)
dir_idx = [i for i, c in enumerate(cols) if c.upper() == "DIRIGENTE"]
if len(dir_idx) >= 2:
    for extra_i in dir_idx[1:]:
        cols[extra_i] = "_DIRIGENTE_IGNORAR"
    print(f"  ⚠️  {len(dir_idx)} columnas DIRIGENTE encontradas. Solo se usa la primera.")
df_raw.columns = cols
df = df_raw.copy()

# Normalizar cédula
def fix_cedula(v):
    if v is None: return ""
    s = str(v).strip()
    if s in ("", "nan", "NaN", "None"): return ""
    try: return str(int(float(s)))
    except: return s

df["CEDULA"] = df["CEDULA"].apply(fix_cedula)
df = df[df["CEDULA"] != ""].copy()

# Normalizar columnas de matching
for col in ["NOMBRE COMPLETO", "COORDINADOR"]:
    if col in df.columns:
        df[col] = df[col].fillna("").apply(lambda x: str(x).strip().upper())

if "DIRIGENTE" in df.columns:
    df["DIRIGENTE"] = df["DIRIGENTE"].fillna("").apply(lambda x: str(x).strip().upper())

print(f"  ✅ {len(df)} filas válidas")

# Filas con dirigente asignado
df_con_dir = df[df["DIRIGENTE"].notna() & (df["DIRIGENTE"] != "") & (df["DIRIGENTE"] != "NAN")].copy()
print(f"  ℹ️  {len(df_con_dir)} filas con DIRIGENTE asignado en el Excel")

# ── Cargar datos de BD ─────────────────────────────────────────
print("\n🗄️  Cargando datos de BD...")

# Usuarios: cedula → usuario_id
print("  → Cargando usuarios...")
all_usuarios = get_all("usuarios", "select=id,numero_documento,nombres,apellidos")
uid_by_cedula: dict[str, str] = {u["numero_documento"]: u["id"] for u in all_usuarios}
nombre_to_uid: dict[str, str] = {
    f"{u['nombres']} {u['apellidos']}".strip().upper(): u["id"]
    for u in all_usuarios if u.get("nombres")
}
print(f"     {len(uid_by_cedula)} usuarios cargados")

# Coordinadores: usuario_id → coordinador.id
print("  → Cargando coordinadores...")
all_coords = get_all("coordinadores", "select=id,usuario_id")
cid_by_uid: dict[str, str] = {c["usuario_id"]: c["id"] for c in all_coords}
print(f"     {len(cid_by_uid)} coordinadores cargados")

# Militantes: usuario_id → militante.id (para el PATCH)
print("  → Cargando militantes...")
all_mils = get_all("militantes", "select=id,usuario_id,dirigente_id")
mil_by_uid: dict[str, dict] = {m["usuario_id"]: m for m in all_mils}
print(f"     {len(mil_by_uid)} militantes cargados")

# ── Resolver nombre de dirigente → coordinador.id ─────────────
# El dirigente en el Excel es un nombre completo. Lo buscamos en usuarios
# y luego en coordinadores por usuario_id.
def resolver_dirigente_cid(nombre_dirigente: str):
    """Dado el nombre completo del dirigente, devuelve su coordinadores.id o None."""
    uid = nombre_to_uid.get(nombre_dirigente)
    if not uid:
        # Intentar match parcial (orden apellido/nombre diferente)
        for nom, u in nombre_to_uid.items():
            if all(p in nom for p in nombre_dirigente.split() if len(p) > 2):
                uid = u
                break
    if not uid:
        return None
    return cid_by_uid.get(uid)

# ── Aplicar parche ─────────────────────────────────────────────
print("\n🔧 Aplicando parche dirigente_id...")
actualizados  = 0
sin_militante = 0
sin_dirigente_bd = 0
ya_tenia      = 0
errores       = 0

for _, row in df_con_dir.iterrows():
    cedula   = str(row["CEDULA"]).strip()
    dir_nom  = str(row["DIRIGENTE"]).strip().upper()

    # Obtener usuario_id del militante
    uid = uid_by_cedula.get(cedula)
    if not uid:
        continue

    # Obtener el militante
    mil = mil_by_uid.get(uid)
    if not mil:
        sin_militante += 1
        continue

    # Resolver coordinador_id del dirigente
    d_cid = resolver_dirigente_cid(dir_nom)
    if not d_cid:
        sin_dirigente_bd += 1
        print(f"  ⚠️  Dirigente no encontrado en BD: '{dir_nom}' (cédula militante: {cedula})")
        continue

    # Si ya tiene el valor correcto, no hacer PATCH
    if mil.get("dirigente_id") == d_cid:
        ya_tenia += 1
        continue

    # PATCH
    sc = patch("militantes", f"id=eq.{mil['id']}", {"dirigente_id": d_cid})
    if sc in (200, 201, 204):
        actualizados += 1
    else:
        errores += 1
        print(f"  ❌ Error PATCH militante {mil['id']}: HTTP {sc}")

# ── Resumen ────────────────────────────────────────────────────
print()
print("=" * 62)
print("  📊  RESUMEN PARCHE dirigente_id")
print("=" * 62)
print(f"  ✅ Actualizados        : {actualizados}")
print(f"  ⏭  Ya tenían el valor : {ya_tenia}")
print(f"  ⚠️  Sin militante en BD: {sin_militante}")
print(f"  ⚠️  Dirigente no en BD : {sin_dirigente_bd}")
print(f"  ❌ Errores de PATCH   : {errores}")
print()

# Verificar resultado final
r_check = requests.get(
    f"{BASE}/militantes?select=id&dirigente_id=not.is.null",
    headers={**H, "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"},
    verify=False, timeout=15
)
n_con = r_check.headers.get("Content-Range", "?/?").split("/")[-1]
print(f"  🗄️  Militantes con dirigente_id en BD: {n_con}")
print()
print("  ✅  PARCHE COMPLETADO")
print("=" * 62)
