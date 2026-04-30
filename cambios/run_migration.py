#!/usr/bin/env python3
"""
=============================================================
  MIGRACIÓN APOLO - Personas (78).xlsx
  Estrategia: DELETE completo en orden FK → INSERT limpio
=============================================================
"""
import subprocess, sys, os, math, re as _re
from collections import Counter

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

H   = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
       "Content-Type": "application/json", "Prefer": "return=representation"}
# INSERT ignorando duplicados (idempotente)
HI  = {**H, "Prefer": "resolution=ignore-duplicates,return=minimal"}
# UPSERT: si ya existe por unique key → actualiza con los nuevos datos
HU  = {**H, "Prefer": "resolution=merge-duplicates,return=minimal"}
BASE = SUPABASE_URL + "/rest/v1"

# ── REST helpers ────────────────────────────────────────────────
def get(table, params=""):
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

def insert(table, records, batch=100):
    """INSERT idempotente: ignore-duplicates + trata 23505 como éxito."""
    if not records: return 0
    ok = 0
    for i in range(0, len(records), batch):
        b = records[i:i+batch]
        r = requests.post(f"{BASE}/{table}", json=b, headers=HI,
                          verify=False, timeout=60)
        if r.status_code in (200, 201):
            ok += len(b)
        else:
            # Fallback individual para no perder registros válidos
            for j, rec in enumerate(b):
                r2 = requests.post(f"{BASE}/{table}", json=[rec], headers=HI,
                                   verify=False, timeout=30)
                if r2.status_code in (200, 201):
                    ok += 1
                else:
                    try:
                        err = r2.json()
                        code = err.get('code','')
                        # 23505 = duplicate key → ya existe, contar como ok (idempotente)
                        if code == '23505':
                            ok += 1
                            continue
                        print(f"  ❌ {table}[{i+j}] {code} "
                              f"{err.get('message','')[:120]}")
                    except:
                        print(f"  ❌ {table}[{i+j}] HTTP {r2.status_code}: "
                              f"{r2.text[:120]}")
    return ok

def upsert(table, records, batch=100, on_conflict=None):
    """UPSERT: merge-duplicates → inserta o actualiza si ya existe.
    on_conflict: columna(s) para ON CONFLICT, ej. 'numero_documento'.
    Si no se especifica PostgREST usa el PK."""
    if not records: return 0
    ok = 0
    url = f"{BASE}/{table}"
    if on_conflict:
        url += f"?on_conflict={on_conflict}"
    for i in range(0, len(records), batch):
        b = records[i:i+batch]
        r = requests.post(url, json=b, headers=HU,
                          verify=False, timeout=60)
        if r.status_code in (200, 201):
            ok += len(b)
        else:
            for j, rec in enumerate(b):
                r2 = requests.post(url, json=[rec], headers=HU,
                                   verify=False, timeout=30)
                if r2.status_code in (200, 201):
                    ok += 1
                else:
                    try:
                        err = r2.json()
                        print(f"  ❌ {table}[{i+j}] {err.get('code','')} "
                              f"{err.get('message','')[:120]}")
                    except:
                        print(f"  ❌ {table}[{i+j}] HTTP {r2.status_code}: "
                              f"{r2.text[:120]}")
    return ok

def delete_table(table, filt):
    """Borra todos los registros que coincidan con el filtro."""
    r = requests.delete(f"{BASE}/{table}?{filt}",
                        headers={**H, "Prefer": "return=minimal"},
                        verify=False, timeout=30)
    return r.status_code

def count(table):
    r = requests.get(f"{BASE}/{table}?select=id",
                     headers={**H, "Prefer": "count=exact",
                              "Range-Unit": "items", "Range": "0-0"},
                     verify=False, timeout=15)
    return r.headers.get("Content-Range", "?/?").split("/")[-1]

def col_exists(table, col):
    r = requests.get(f"{BASE}/{table}?select={col}&limit=1",
                     headers=H, verify=False, timeout=10)
    return r.status_code == 200

# ── Utilidades de datos ─────────────────────────────────────────
def q(v):
    if v is None or (isinstance(v, float) and math.isnan(v)) \
       or str(v).strip() in ("", "nan", "NaN", "None", "nat", "NaT"):
        return None
    return str(v).strip()

def qf(v):
    try:
        f = float(str(v).strip())
        return 0 if math.isnan(f) else int(round(f))
    except: return 0

_EMAIL_RE = _re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]{2,}$')

def qemail(e):
    s = q(e)
    if not s: return None
    sl = s.lower()
    return sl if _EMAIL_RE.match(sl) else None

def qdate(v):
    if v is None: return None
    try:
        if pd.isna(v): return None
    except: pass
    s = str(v).strip()
    if s in ("", "nan", "NaT", "None"): return None
    d = s[:10] if "T" in s else s[:10]
    # Fechas inválidas de MySQL/Excel: año 0 o día/mes 00
    if d.startswith("0000") or d in ("00-00-00", "0000-00-00"): return None
    parts = d.split("-")
    if len(parts) == 3 and parts[0] == "0000": return None
    return d

def fix_cedula(v):
    if v is None: return ""
    s = str(v).strip()
    if s in ("", "nan", "NaN", "None"): return ""
    try: return str(int(float(s)))
    except: return s

def split_nombre(nombre):
    parts = str(nombre or "").strip().upper().split()
    n = len(parts)
    if n == 0: return "", ""
    if n == 1: return parts[0], ""
    if n == 2: return parts[0], parts[1]
    if n == 3: return parts[0], " ".join(parts[1:])
    return " ".join(parts[:2]), " ".join(parts[2:])

# ── Mapas de valores aceptados por CHECK constraints de la DB ────
GENERO_MAP = {
    "masculino": "Masculino", "femenino": "Femenino", "otro": "Otro",
    "m": "Masculino", "f": "Femenino",
    "hombre": "Masculino", "mujer": "Femenino",
    "MASCULINO": "Masculino", "FEMENINO": "Femenino", "OTRO": "Otro",
    "M": "Masculino", "F": "Femenino",
}
ESCOLARIDAD_MAP = {
    "primaria": "Primaria", "bachillerato": "Bachillerato",
    "tecnico": "Técnico", "técnico": "Técnico",
    "tecnologo": "Tecnólogo", "tecnólogo": "Tecnólogo",
    "profesional": "Profesional",
    "especializacion": "Especialización", "especialización": "Especialización",
    "maestria": "Maestría", "maestría": "Maestría",
    "doctorado": "Doctorado", "ninguno": "Ninguno",
    "ninguna": "Ninguno", "sin estudios": "Ninguno",
}
VIVIENDA_MAP = {
    "propia": "Propia", "arrendada": "Arrendada",
    "familiar": "Familiar", "otra": "Otra", "otro": "Otra",
    "arriendo": "Arrendada",
}
ESTADO_MAP = {
    "activo": "activo", "inactivo": "inactivo", "suspendido": "suspendido",
    "active": "activo", "inactive": "inactivo",
}

def norm_map(val, mapping):
    """Busca en el mapa por valor exacto y luego por lowercase."""
    if not val: return None
    v = str(val).strip()
    if v in mapping: return mapping[v]
    vl = v.lower()
    if vl in mapping: return mapping[vl]
    return None   # no enviamos valores inválidos

def bar(cur, tot, w=42):
    pct = cur / tot if tot else 0
    done = int(pct * w)
    print(f"\r  [{'█'*done}{'░'*(w-done)}] {cur}/{tot}", end="", flush=True)

# ════════════════════════════════════════════════════════════════
print()
print("=" * 62)
print("  🚀  MIGRACIÓN APOLO  →  Supabase")
print("  📄  Personas (78).xlsx  |  Slate limpio")
print("=" * 62)

# ── 1. TEST CONEXIÓN ────────────────────────────────────────────
print("\n🔌 Verificando conexión...")
try:
    r = requests.get(f"{BASE}/ciudades?limit=1", headers=H,
                     verify=False, timeout=10)
    if r.status_code not in (200, 406):
        print(f"  ❌ {r.status_code}: {r.text[:120]}")
        sys.exit(1)
    print(f"  ✅ Conectado ({SUPABASE_URL})")
except Exception as e:
    print(f"  ❌ Sin conexión: {e}"); sys.exit(1)

# ── 2. CARGAR Y NORMALIZAR EXCEL ────────────────────────────────
print(f"\n📊 Cargando Excel...")
df_raw = pd.read_excel(EXCEL_FILE)
df_raw.columns = [str(c).strip() for c in df_raw.columns]

# Renombrar segunda columna DIRIGENTE (contiene teléfonos, se ignora)
# La primera DIRIGENTE = nombre del dirigente asignado
# La segunda DIRIGENTE = "NO SE DE DONDE SALE ESTE NUMERO" / teléfono → se ignora
cols = list(df_raw.columns)
dir_idx = [i for i, c in enumerate(cols) if c.upper() == "DIRIGENTE"]
if len(dir_idx) >= 2:
    for extra_i in dir_idx[1:]:
        cols[extra_i] = "_DIRIGENTE_IGNORAR"   # marcada para ignorar
    print(f"  ⚠️  Se encontraron {len(dir_idx)} columnas DIRIGENTE. "
          f"Solo se usa la primera (nombre). Las demás se ignoran.")
df_raw.columns = cols
df = df_raw.copy()

# Normalizar cédula
df["CEDULA"] = df["CEDULA"].apply(fix_cedula)

# Normalizar texto — solo columnas de matching/geography en MAYÚSCULAS
# GENERO, ESTUDIOS, VIVIENDA, OCUPACION se dejan tal cual para mapeo posterior
for col in ["NOMBRE COMPLETO", "COORDINADOR", "CIUDAD", "BARRIO", "LOCALIDAD"]:
    if col in df.columns:
        df[col] = df[col].fillna("").apply(lambda x: str(x).strip().upper())

# ESTADO lo normalizamos pero en minúsculas (chk_estado acepta: activo/inactivo/suspendido)
if "ESTADO" in df.columns:
    df["ESTADO"] = df["ESTADO"].fillna("").apply(lambda x: str(x).strip().lower())

# Demás campos de texto: strip sin cambiar case (los mapas los convierten)
for col in ["GENERO", "TALLA", "ESTUDIOS", "OCUPACION", "VIVIENDA"]:
    if col in df.columns:
        df[col] = df[col].fillna("").apply(lambda x: str(x).strip())

if "DIRIGENTE" in df.columns:
    df["DIRIGENTE"] = df["DIRIGENTE"].fillna("").apply(
        lambda x: str(x).strip().upper())

# Normalizar TIPO
df["TIPO"] = df["TIPO"].astype(str).str.strip()
df["TIPO"] = df["TIPO"].replace({"80001-02":"80001","80003-02":"80003"})
tipos_validos = {"80001","80002","80003","80004","80005"}
mask = (~df["TIPO"].isin(tipos_validos)) & (df["CEDULA"] != "")
df.loc[mask, "TIPO"] = "80002"

# Excluir filas sin cédula
df = df[df["CEDULA"] != ""].copy()
print(f"  ✅ {len(df)} filas válidas  |  tipos: {dict(Counter(df['TIPO'].tolist()))}")

# ── Mapa nombre → cédula ─────────────────────────────────────
nombre_to_cedula: dict[str,str] = {}
for _, row in df.iterrows():
    n = str(row["NOMBRE COMPLETO"]).strip().upper()
    c = str(row["CEDULA"]).strip()
    if n and c:
        nombre_to_cedula[n] = c

# ── Entidades sintéticas (coordinadores sin fila en Excel) ───
all_coord_names = set(df["COORDINADOR"].tolist()) - {"", "NAN"}
synthetic_rows  = []
for i, nombre in enumerate(sorted(n for n in all_coord_names
                                   if n not in nombre_to_cedula)):
    num = nombre.split()[-1] if nombre.split()[-1].isdigit() else str(i+2)
    tag = f"ECOSOMOSTODOS{num}" if "ECO SOMOS TODOS" in nombre else f"SINTETICO{i+1}"
    nombre_to_cedula[nombre] = tag
    print(f"  ⚠️  Sintético: '{nombre}' → {tag}")
    synthetic_rows.append({
        "CEDULA":tag,"NOMBRE COMPLETO":nombre,"TIPO":"80002","ESTADO":"activo",
        "COORDINADOR":"","DIRIGENTE":"","CIUDAD":None,"BARRIO":None,
        "LOCALIDAD":None,"EMAIL":None,"TELEFONO":None,
    })

if synthetic_rows:
    df_s = pd.DataFrame(synthetic_rows)
    for col in df.columns:
        if col not in df_s.columns: df_s[col] = None
    df_s["TIPO"] = "80002"
    df = pd.concat([df, df_s], ignore_index=True)
    print(f"  + {len(synthetic_rows)} sintéticos")

df_coord = df[df["TIPO"].isin(["80002","80004","80005"])].copy()
df_dir   = df[df["TIPO"] == "80003"].copy()
df_mil   = df[df["TIPO"] == "80001"].copy()
print(f"  coord={len(df_coord)}  dir={len(df_dir)}  mil={len(df_mil)}")

# Detectar columnas
def find_col(*kws):
    for kw in kws:
        for c in df.columns:
            if kw.upper() in c.upper(): return c
    return None

DIR_COL   = find_col("DIRECCI")
COMP_COLS = {
    "marketing": find_col("MARKETING"),
    "cautivo":   find_col("CAUTIVO"),
    "impacto":   find_col("IMPACTO"),
    "difusion":  find_col("DIFUSI"),
    "proyecto":  find_col("PROYECTO"),
}

# ── Pre-detectar emails duplicados → esos usarán fallback ────────
# (198 personas comparten emails reales; la unique constraint fallaría)
_email_re = _re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]{2,}$')
_email_cnt: dict[str,int] = {}
for _, _row in df.iterrows():
    _e = str(_row.get("EMAIL","") or "").strip().lower()
    if _email_re.match(_e):
        _email_cnt[_e] = _email_cnt.get(_e, 0) + 1
DUPLICATE_EMAILS: set[str] = {e for e, c in _email_cnt.items() if c > 1}
print(f"  ⚠️  {len(DUPLICATE_EMAILS)} emails compartidos → usarán migrado_cedula@migrado.co")

# ── 3. LIMPIEZA TOTAL (orden FK: más dependiente primero) ───────
print("\n🧹 Limpieza total (orden FK)...")
# Tabla                          Filtro que borra todo
CLEAN_PLAN = [
    ("dirigentes",            "id_dirigente=neq.00000000-0000-0000-0000-000000000000"),
    ("militantes",            "id=neq.00000000-0000-0000-0000-000000000000"),
    ("usuario_perfil",        "usuario_id=neq.00000000-0000-0000-0000-000000000000"),
    ("perfil_permiso_modulo", "perfil_id=neq.00000000-0000-0000-0000-000000000000"),
    ("coordinadores",         "usuario_id=neq.00000000-0000-0000-0000-000000000000"),
    ("usuarios",              "id=neq.00000000-0000-0000-0000-000000000000"),
    ("barrios",               "id=neq.00000000-0000-0000-0000-000000000000"),
    ("localidades",           "id=neq.00000000-0000-0000-0000-000000000000"),
    ("ciudades",              "id=neq.00000000-0000-0000-0000-000000000000"),
    ("perfiles",              "id=neq.00000000-0000-0000-0000-000000000000"),
    ("modulos",               "id=neq.00000000-0000-0000-0000-000000000000"),
    ("permisos",              "id=neq.00000000-0000-0000-0000-000000000000"),
    ("tipos_militante",       "codigo=gte.0"),
]
CRITICAS = {"usuarios", "coordinadores", "militantes", "dirigentes"}
limpieza_ok = True

for table, filt in CLEAN_PLAN:
    sc = delete_table(table, filt)
    # Reintentar hasta 3 veces si quedan filas
    for intento in range(3):
        remaining = count(table)
        if str(remaining) in ("0", "*"):
            break
        try:
            n = int(remaining)
            if n == 0: break
            print(f"    ↩️  {table}: quedan {n}, reintento {intento+1}/3...")
            delete_table(table, filt)
        except: break
    remaining = count(table)
    status = "✅" if str(remaining) in ("0","*") else "⚠️"
    print(f"  {status} {table:<26}: sc={sc} | quedan={remaining}")
    if table in CRITICAS and str(remaining) not in ("0","*"):
        try:
            n = int(remaining)
            if n > 0 and table != "usuarios":
                # usuarios usa UPSERT → no necesita estar vacía
                print(f"  ⚠️  '{table}' tiene {n} filas residuales. "
                      f"Se intentará continuar con UPSERT/ignore.")
        except: pass

print("  ℹ️  usuarios usa UPSERT → datos existentes se actualizarán.")

# ── 4. CATÁLOGOS (tablas vacías ahora) ──────────────────────────
print("\n🏗️  Insertando catálogos...")

insert("tipos_militante", [
    {"codigo":80001,"descripcion":"Militante",            "activo":True},
    {"codigo":80002,"descripcion":"Coordinador de Zona",  "activo":True},
    {"codigo":80003,"descripcion":"Dirigente",            "activo":True},
    {"codigo":80004,"descripcion":"Coordinador Local",    "activo":True},
    {"codigo":80005,"descripcion":"Coordinador Municipal","activo":True},
])
insert("perfiles", [
    {"nombre":"Super Admin",           "descripcion":"Administrador del sistema",    "nivel_jerarquico":1,"activo":True},
    {"nombre":"Coordinador Municipal", "descripcion":"Coordinador a nivel municipal","nivel_jerarquico":2,"activo":True},
    {"nombre":"Coordinador Local",     "descripcion":"Coordinador de area local",    "nivel_jerarquico":3,"activo":True},
    {"nombre":"Coordinador de Zona",   "descripcion":"Coordinador de zona/sector",   "nivel_jerarquico":4,"activo":True},
    {"nombre":"Dirigente",             "descripcion":"Dirigente politico",            "nivel_jerarquico":5,"activo":True},
    {"nombre":"Militante",             "descripcion":"Militante de base",             "nivel_jerarquico":6,"activo":True},
])
insert("permisos", [
    {"codigo":"READ",   "nombre":"Leer",       "descripcion":"Ver registros"},
    {"codigo":"CREATE", "nombre":"Crear",      "descripcion":"Crear registros"},
    {"codigo":"UPDATE", "nombre":"Actualizar", "descripcion":"Editar registros"},
    {"codigo":"DELETE", "nombre":"Eliminar",   "descripcion":"Eliminar registros"},
    {"codigo":"EXPORT", "nombre":"Exportar",   "descripcion":"Exportar datos"},
    {"codigo":"IMPORT", "nombre":"Importar",   "descripcion":"Importar datos"},
    {"codigo":"APPROVE","nombre":"Aprobar",    "descripcion":"Aprobar solicitudes"},
    {"codigo":"ADMIN",  "nombre":"Administrar","descripcion":"Administración total"},
])
insert("modulos", [
    {"nombre":"Módulo Personas",     "descripcion":"Gestión de fichas técnicas",      "ruta":"/dashboard/personas",      "activo":True,"obligatorio":False,"orden":1},
    {"nombre":"Módulo Coordinador",  "descripcion":"Gestión de coordinadores",         "ruta":"/dashboard/coordinador",   "activo":True,"obligatorio":False,"orden":2},
    {"nombre":"Módulo Militante",    "descripcion":"Gestión de militantes",            "ruta":"/dashboard/militante",     "activo":True,"obligatorio":False,"orden":3},
    {"nombre":"Módulo Dirigente",    "descripcion":"Gestión de dirigentes",            "ruta":"/dashboard/dirigente",     "activo":True,"obligatorio":False,"orden":4},
    {"nombre":"Gestión Gerencial",   "descripcion":"Panel gerencial y estadísticas",   "ruta":"/dashboard/gerencial",     "activo":True,"obligatorio":False,"orden":5},
    {"nombre":"Alistamiento Debate", "descripcion":"Alistamiento para debates",        "ruta":"/dashboard/debate",        "activo":True,"obligatorio":False,"orden":6},
    {"nombre":"Asignar Datos",       "descripcion":"Asignación de datos",              "ruta":"/dashboard/datos",         "activo":True,"obligatorio":False,"orden":7},
    {"nombre":"Agenda",              "descripcion":"Gestión de agenda",                "ruta":"/dashboard/agenda",        "activo":True,"obligatorio":False,"orden":8},
    {"nombre":"Gestión de Roles",    "descripcion":"Gestión de roles y permisos",      "ruta":"/dashboard/roles",         "activo":True,"obligatorio":False,"orden":9},
    {"nombre":"Configuración",       "descripcion":"Configuración general",            "ruta":"/dashboard/configuracion", "activo":True,"obligatorio":False,"orden":10},
    {"nombre":"Actividades",         "descripcion":"Registro de actividades",          "ruta":"/dashboard/actividades",   "activo":True,"obligatorio":False,"orden":11},
])

# Cargar IDs de catálogos
perfiles_map = {r["nombre"]: r["id"] for r in get("perfiles","select=id,nombre")}
permisos_map = {r["codigo"]: r["id"] for r in get("permisos","select=id,codigo")}
modulos_db   = {r["nombre"]: r["id"] for r in get("modulos","select=id,nombre")}
print(f"  ✅ Perfiles: {len(perfiles_map)}  Permisos: {len(permisos_map)}  Módulos: {len(modulos_db)}")

if not perfiles_map:
    print("  ❌ CRÍTICO: no se cargaron perfiles. Abortando.")
    sys.exit(1)

P_COORD = {
    "80005": perfiles_map.get("Coordinador Municipal"),
    "80004": perfiles_map.get("Coordinador Local"),
    "80002": perfiles_map.get("Coordinador de Zona"),
}
P_DIR = perfiles_map.get("Dirigente")
P_MIL = perfiles_map.get("Militante")
print(f"  P_COORD={P_COORD}")
print(f"  P_DIR={P_DIR}  P_MIL={P_MIL}")

# ── 5. PERMISOS POR PERFIL ───────────────────────────────────────
print("\n🔑 Configurando permisos por perfil...")
TODOS_PERMS = list(permisos_map.keys())
CRUD_PERMS  = ["READ","CREATE","UPDATE","DELETE","EXPORT"]
TODOS_MODS  = list(modulos_db.keys())
MODS_MAIN   = ["Módulo Personas","Módulo Coordinador","Módulo Militante","Módulo Dirigente",
                "Gestión Gerencial","Alistamiento Debate","Asignar Datos","Agenda","Actividades"]
MODS_COORD  = ["Módulo Personas","Módulo Militante","Módulo Dirigente","Actividades","Agenda"]
MODS_DIR    = ["Módulo Personas","Módulo Militante","Actividades"]
MODS_MIL    = ["Módulo Personas"]

ppm_rows = []
for pnombre, (mods, perms) in {
    "Super Admin":           (TODOS_MODS, TODOS_PERMS),
    "Coordinador Municipal": (MODS_MAIN,  TODOS_PERMS),
    "Coordinador Local":     (MODS_MAIN,  CRUD_PERMS),
    "Coordinador de Zona":   (MODS_COORD, CRUD_PERMS),
    "Dirigente":             (MODS_DIR,   CRUD_PERMS),
    "Militante":             (MODS_MIL,   ["READ"]),
}.items():
    pid = perfiles_map.get(pnombre)
    if not pid: continue
    for mnom in mods:
        mid = modulos_db.get(mnom)
        if not mid: continue
        for pcode in perms:
            pmid = permisos_map.get(pcode)
            if not pmid: continue
            ppm_rows.append({"perfil_id":pid,"modulo_id":mid,"permiso_id":pmid})
insert("perfil_permiso_modulo", ppm_rows, batch=100)
print(f"  ✅ {len(ppm_rows)} entradas perfil-módulo-permiso")

# ── 6. GEOGRAFÍA ──────────────────────────────────────────────────
print("\n🏙️  Ciudades...")
ciudades_set = {str(v).strip().upper() for v in df["CIUDAD"].dropna()
                if str(v).strip().upper() not in ("","NAN")}
insert("ciudades", [{"nombre":c,"activo":True} for c in sorted(ciudades_set)])
ciu_map = {r["nombre"].upper().strip(): r["id"] for r in get("ciudades","select=id,nombre")}
print(f"  ✅ {len(ciu_map)} ciudades en BD")

print("📍 Localidades...")
loc_set = set()
for _, row in df.iterrows():
    c = str(row.get("CIUDAD","")).strip().upper()
    l = str(row.get("LOCALIDAD","")).strip().upper()
    if c and l and c not in ("","NAN") and l not in ("","NAN"):
        loc_set.add((c,l))
loc_payload = [{"nombre":l,"ciudad_id":ciu_map[c],"activo":True}
               for c,l in loc_set if c in ciu_map]
insert("localidades", loc_payload)
loc_map = {(r["nombre"].upper().strip(), r["ciudad_id"]): r["id"]
           for r in get("localidades","select=id,nombre,ciudad_id")}
print(f"  ✅ {len(loc_map)} localidades en BD")

print("🏘️  Barrios...")
bar_set = set()
for _, row in df.iterrows():
    c = str(row.get("CIUDAD","")).strip().upper()
    l = str(row.get("LOCALIDAD","")).strip().upper()
    b = str(row.get("BARRIO","")).strip().upper()
    if c and b and c not in ("","NAN") and b not in ("","NAN"):
        bar_set.add((c,l,b))
bar_payload = []
for c,l,b in bar_set:
    cid = ciu_map.get(c)
    lid = loc_map.get((l,cid)) if cid else None
    if cid: bar_payload.append({"nombre":b,"ciudad_id":cid,"localidad_id":lid,"activo":True})
insert("barrios", bar_payload)
bar_map = {(r["nombre"].upper().strip(), r["ciudad_id"]): r["id"]
           for r in get("barrios","select=id,nombre,ciudad_id")}
print(f"  ✅ {len(bar_map)} barrios en BD")

# ── 7. COLUMNAS OPCIONALES ──────────────────────────────────────
print("\n🔍 Detectando columnas opcionales...")
HAS = {col: col_exists("usuarios", col)
       for col in ["fecha_nacimiento","genero","talla_camisa","nivel_escolaridad",
                   "perfil_ocupacion","tipo_vivienda","whatsapp","facebook",
                   "referencia_seleccion","numero_hijos"]}
HAS_DIF  = col_exists("militantes","compromiso_difusion")
HAS_PROY = col_exists("militantes","compromiso_proyecto")
print("  " + " ".join(f"{k}={v}" for k,v in HAS.items()))

# ── 8. DESCUBRIR TIPO VÁLIDO EN coordinadores ───────────────────
print("\n🔍 Descubriendo constraint tipo en coordinadores...")
# Crear un usuario temporal para el probe
dummy_doc = "PROBETIPO999"
r_tmp = requests.post(f"{BASE}/usuarios",
    json=[{"tipo_documento":"CC","numero_documento":dummy_doc,
           "nombres":"Probe","apellidos":"Tipo",
           "email":"probe_tipo@migrado.co","estado":"activo"}],
    headers=HI, verify=False, timeout=10)
tmp_uid = None
if r_tmp.status_code in (200,201):
    tmp_rows = get("usuarios","numero_documento=eq.PROBETIPO999&select=id")
    tmp_uid  = tmp_rows[0]["id"] if tmp_rows else None

valid_tipo = "Coordinador"
if tmp_uid:
    for v in ["Coordinador","Estructurador","coordinador"]:
        rp = requests.post(f"{BASE}/coordinadores",
            json=[{"usuario_id":tmp_uid,"email":"probe@migrado.co",
                   "estado":"activo","tipo":v}],
            headers={**H,"Prefer":"return=representation"},
            verify=False, timeout=10)
        if rp.status_code in (200,201):
            rows_p = rp.json()
            if isinstance(rows_p,list) and rows_p:
                requests.delete(f"{BASE}/coordinadores?id=eq.{rows_p[0]['id']}",
                    headers={**H,"Prefer":"return=minimal"}, verify=False)
            valid_tipo = v
            break
    # Limpiar usuario temporal
    requests.delete(f"{BASE}/usuarios?numero_documento=eq.PROBETIPO999",
        headers={**H,"Prefer":"return=minimal"}, verify=False)
print(f"  ✅ tipo válido = '{valid_tipo}'")

# ── Helper: construir registro de usuario ────────────────────────
def mk_user(row):
    cedula = str(row.get("CEDULA","")).strip()
    nombre = str(row.get("NOMBRE COMPLETO","")).strip().upper()
    nombres, apellidos = split_nombre(nombre)
    cn = str(row.get("CIUDAD","")).strip().upper()
    ln = str(row.get("LOCALIDAD","")).strip().upper()
    bn = str(row.get("BARRIO","")).strip().upper()
    if cn in ("","NAN","NONE"): cn = None
    if ln in ("","NAN","NONE"): ln = None
    if bn in ("","NAN","NONE"): bn = None
    cid = ciu_map.get(cn) if cn else None
    lid = loc_map.get((ln,cid)) if (ln and cid) else None
    bid = bar_map.get((bn,cid)) if (bn and cid) else None
    rec = {
        "tipo_documento":   "CC",
        "numero_documento": cedula,
        "nombres":          nombres or nombre,
        "apellidos":        apellidos or "",
        "email":            (qemail(row.get("EMAIL")) or None
                             if qemail(row.get("EMAIL")) not in DUPLICATE_EMAILS
                             else None) or f"migrado_{cedula}@migrado.co",
        "celular":          q(row.get("TELEFONO","")),
        "estado":           ESTADO_MAP.get((q(row.get("ESTADO","")) or "activo").lower(), "activo"),
        "ciudad_id":        cid, "ciudad_nombre":    cn,
        "localidad_id":     lid, "localidad_nombre": ln,
        "barrio_id":        bid, "barrio_nombre":    bn,
    }
    if DIR_COL: rec["direccion"] = q(row.get(DIR_COL,""))
    fd = qdate(row.get("FECHA"))
    if fd: rec["creado_en"] = fd
    # Campos opcionales
    if HAS["fecha_nacimiento"]:
        fn = qdate(row.get("NACIMIENTO"))
        if fn: rec["fecha_nacimiento"] = fn
    if HAS["genero"]:
        g = norm_map(q(row.get("GENERO","")), GENERO_MAP)
        if g: rec["genero"] = g
    if HAS["talla_camisa"]:
        t = q(row.get("TALLA",""))
        if t: rec["talla_camisa"] = t.upper()   # XS/S/M/L/XL/XXL
    if HAS["nivel_escolaridad"]:
        e = norm_map(q(row.get("ESTUDIOS","")), ESCOLARIDAD_MAP)
        if e: rec["nivel_escolaridad"] = e
    if HAS["perfil_ocupacion"]:
        o = q(row.get("OCUPACION",""))
        if o: rec["perfil_ocupacion"] = o       # texto libre, sin constraint
    if HAS["tipo_vivienda"]:
        v = norm_map(q(row.get("VIVIENDA","")), VIVIENDA_MAP)
        if v: rec["tipo_vivienda"] = v
    if HAS["whatsapp"]:
        w = q(row.get("WHATSAPP",""))
        if w: rec["whatsapp"] = w
    if HAS["facebook"]:
        fb = q(row.get("FACEBOOK",""))
        if fb: rec["facebook"] = fb
    if HAS["referencia_seleccion"]:
        rf = q(row.get("REFERENCIA",""))
        if rf: rec["referencia_seleccion"] = rf
        tr = q(row.get("TEL REFERENCIA",""))
        if tr: rec["telefono_referencia"] = tr
    if HAS["numero_hijos"]:
        h = q(row.get("HIJOS",""))
        if h:
            try: rec["numero_hijos"] = int(float(h))
            except: pass
    # comp_proyecto: texto libre desde columna PROYECTO del Excel
    proy_col = COMP_COLS.get("proyecto")
    if proy_col:
        pv = q(row.get(proy_col, ""))
        if pv:
            try:
                # Si es número (ej: 0.0) ignorar; solo guardar texto real
                float(pv)
            except (ValueError, TypeError):
                rec["comp_proyecto"] = pv.strip()
    return rec

def get_comp(row, key):
    col = COMP_COLS.get(key)
    if not col or col not in df.columns: return 0
    try: return qf(row.get(col, 0))
    except: return 0

def mk_mil(uid, row, c_id, d_id=None):
    """
    Construye el registro de militante.
    c_id = coordinador_id (ID en tabla coordinadores del coordinador asignado)
    d_id = dirigente_id   (ID en tabla coordinadores del dirigente asignado, opcional)
    """
    rec = {
        "usuario_id":           uid,
        "tipo":                 "militante",
        "coordinador_id":       c_id,
        "estado":               (q(row.get("ESTADO","")) or "activo").lower(),
        "compromiso_marketing": get_comp(row,"marketing"),
        "compromiso_cautivo":   get_comp(row,"cautivo"),
        "compromiso_impacto":   get_comp(row,"impacto"),
    }
    if d_id:
        rec["dirigente_id"] = d_id
    if HAS_DIF:  rec["compromiso_difusion"] = get_comp(row,"difusion")
    if HAS_PROY: rec["compromiso_proyecto"] = get_comp(row,"proyecto")
    return rec

# ── 9. INSERTAR TODOS LOS USUARIOS ──────────────────────────────
print(f"\n👤 Usuarios ({len(df)})...")
all_recs = [mk_user(row) for _, row in df.iterrows()
            if str(row.get("CEDULA","")).strip()]
# Deduplicar por cedula (keep last)
seen_ced: dict[str,dict] = {}
for rec in all_recs:
    seen_ced[rec["numero_documento"]] = rec
all_recs = list(seen_ced.values())

for start in range(0, len(all_recs), 100):
    upsert("usuarios", all_recs[start:start+100], batch=100, on_conflict="numero_documento")
    bar(min(start+100, len(all_recs)), len(all_recs))
print(f"\n  ✅ {len(all_recs)} procesados  |  en BD: {count('usuarios')}")

# Cargar mapa completo cedula → {id, ciudad_id, ...}
print("  📍 Cargando IDs de usuarios...")
all_db_u = get("usuarios","select=id,numero_documento,ciudad_id,localidad_id")
uid_map: dict[str,dict] = {u["numero_documento"]: u for u in all_db_u}
print(f"  ✅ {len(uid_map)} usuarios en mapa")

# Mapa nombre → cedula → uid
nombre_to_uid: dict[str,str] = {}
for nombre, cedula in nombre_to_cedula.items():
    ud = uid_map.get(cedula)
    if ud: nombre_to_uid[nombre] = ud["id"]

# ── 10. COORDINADORES (80002, 80004, 80005) ──────────────────────
print(f"\n👥 Coordinadores ({len(df_coord)})...")
coord_recs: list[dict]    = []
coord_up:   list[dict]    = []
coord_rows: dict[str,any] = {}   # uid → row (para dual-militante)

for _, row in df_coord.iterrows():
    ced = str(row.get("CEDULA","")).strip()
    ud  = uid_map.get(ced)
    if not ud: continue
    uid  = ud["id"]
    tipo = str(row.get("TIPO","80002"))
    pid  = P_COORD.get(tipo)
    coord_rows[uid] = row
    _ce = qemail(row.get("EMAIL"))
    rec = {"usuario_id":uid,
           "email": (_ce if _ce and _ce not in DUPLICATE_EMAILS else None)
                    or f"coord_{ced}@migrado.co",
           "tipo":  valid_tipo,
           "estado": (q(row.get("ESTADO","")) or "activo").lower()}
    if pid: rec["perfil_id"] = pid
    coord_recs.append(rec)
    if pid: coord_up.append({"usuario_id":uid,"perfil_id":pid,
                              "es_principal":True,"activo":True})

insert("coordinadores",  coord_recs, batch=50)
insert("usuario_perfil", coord_up,   batch=100)
print(f"  ✅ {len(coord_recs)} intentados  |  en BD: {count('coordinadores')}")

# ── 11. DIRIGENTES (80003) → en coordinadores ────────────────────
print(f"\n🎯 Dirigentes ({len(df_dir)})...")
dir_recs: list[dict]    = []
dir_up:   list[dict]    = []
dir_rows: dict[str,any] = {}

for _, row in df_dir.iterrows():
    ced = str(row.get("CEDULA","")).strip()
    ud  = uid_map.get(ced)
    if not ud: continue
    uid = ud["id"]
    dir_rows[uid] = row
    _de = qemail(row.get("EMAIL"))
    rec = {"usuario_id":uid,
           "email": (_de if _de and _de not in DUPLICATE_EMAILS else None)
                    or f"migrado{ced}@migrado.co",
           "tipo":  valid_tipo,
           "estado": (q(row.get("ESTADO","")) or "activo").lower()}
    if P_DIR: rec["perfil_id"] = P_DIR
    dir_recs.append(rec)
    if P_DIR: dir_up.append({"usuario_id":uid,"perfil_id":P_DIR,
                              "es_principal":True,"activo":True})

insert("coordinadores",  dir_recs, batch=50)
insert("usuario_perfil", dir_up,   batch=100)
n_coord_total = count("coordinadores")
print(f"  ✅ {len(dir_recs)} intentados  |  total en BD: {n_coord_total}")

# ── Mapas coordinador ─────────────────────────────────────────────
all_coord_db = get("coordinadores","select=id,usuario_id,perfil_id&limit=2000")
coord_id_by_uid: dict[str,str] = {c["usuario_id"]: c["id"] for c in all_coord_db}

cedula_to_cid: dict[str,str] = {}
for ced, ud in uid_map.items():
    cid_c = coord_id_by_uid.get(ud["id"])
    if cid_c: cedula_to_cid[ced] = cid_c

nombre_to_cid: dict[str,str] = {}
for nombre, ced in nombre_to_cedula.items():
    cid_c = cedula_to_cid.get(ced)
    if cid_c: nombre_to_cid[nombre] = cid_c

base_coords    = [c for c in all_coord_db if c.get("perfil_id") != P_DIR]
fallback_cid   = base_coords[0]["id"] if base_coords else next(iter(coord_id_by_uid.values()), None)
print(f"  ✅ {len(nombre_to_cid)} coords resueltos por nombre  |  fallback={fallback_cid}")

# ── 12. MILITANTES (80001) ───────────────────────────────────────
# nombre_to_cid incluye coordinadores Y dirigentes (ambos están en tabla coordinadores)
# La columna DIRIGENTE del Excel contiene el nombre del dirigente asignado al militante
print(f"\n⚡ Militantes ({len(df_mil)})...")
done_mil   = 0
mil_sin_dir = 0
for start in range(0, len(df_mil), 100):
    batch_rows = df_mil.iloc[start:start+100]
    mil_b, up_b = [], []
    for _, row in batch_rows.iterrows():
        ced = str(row.get("CEDULA","")).strip()
        ud  = uid_map.get(ced)
        if not ud: continue
        uid     = ud["id"]
        cnombre = str(row.get("COORDINADOR","")).strip().upper()
        c_id    = nombre_to_cid.get(cnombre) or fallback_cid
        # Resolver dirigente desde columna DIRIGENTE (primera ocurrencia, ya renombrada la segunda)
        dnombre = str(row.get("DIRIGENTE","")).strip().upper()
        d_id    = nombre_to_cid.get(dnombre) if dnombre and dnombre not in ("","NAN","NONE") else None
        if not d_id: mil_sin_dir += 1
        mil_b.append(mk_mil(uid, row, c_id, d_id))
        if P_MIL: up_b.append({"usuario_id":uid,"perfil_id":P_MIL,
                                "es_principal":True,"activo":True})
    insert("militantes",     mil_b, batch=200)
    insert("usuario_perfil", up_b,  batch=200)
    done_mil += len(mil_b)
    bar(min(start+100, len(df_mil)), len(df_mil))
print(f"\n  ✅ {done_mil} procesados  |  en BD: {count('militantes')}")
print(f"  ℹ️  {done_mil - mil_sin_dir} con dirigente asignado, {mil_sin_dir} sin dirigente")

# ── 13. RELACIONES DIRIGENTE ↔ COORDINADOR ───────────────────────
print("\n🔗 Relaciones dirigente-coordinador...")
dir_rels = []
seen_pairs: set[tuple] = set()

for _, row in df_dir.iterrows():
    ced = str(row.get("CEDULA","")).strip()
    ud  = uid_map.get(ced)
    if not ud: continue
    dir_self_cid = coord_id_by_uid.get(ud["id"])
    if not dir_self_cid: continue
    cnombre = str(row.get("COORDINADOR","")).strip().upper()
    sup_cid = nombre_to_cid.get(cnombre) if cnombre else None
    if not sup_cid or sup_cid == dir_self_cid:
        sup_cid = fallback_cid
    if not sup_cid: continue
    pair = (dir_self_cid, sup_cid)
    if pair in seen_pairs: continue
    seen_pairs.add(pair)
    dir_rels.append({"id_dirigente":dir_self_cid,"id_coordinador":sup_cid})

insert("dirigentes", dir_rels, batch=100)
print(f"  ✅ {len(dir_rels)} relaciones  |  en BD: {count('dirigentes')}")
dir_to_sup = {r["id_dirigente"]: r["id_coordinador"] for r in dir_rels}

# ── 14. COORD/DIR → TAMBIÉN EN militantes ────────────────────────
print("\n⚡ Coordinadores/Dirigentes → también en militantes...")
mil_x, up_x = [], []

for uid, row in coord_rows.items():
    my_cid  = coord_id_by_uid.get(uid)
    cnombre = str(row.get("COORDINADOR","")).strip().upper()
    c_id    = nombre_to_cid.get(cnombre) if cnombre else None
    if c_id == my_cid: c_id = None
    if not c_id: c_id = fallback_cid
    # Dirigente asignado al coordinador
    dnombre = str(row.get("DIRIGENTE","")).strip().upper()
    d_id    = nombre_to_cid.get(dnombre) if dnombre and dnombre not in ("","NAN","NONE") else None
    mil_x.append(mk_mil(uid, row, c_id, d_id))
    if P_MIL: up_x.append({"usuario_id":uid,"perfil_id":P_MIL,
                            "es_principal":False,"activo":True})

for uid, row in dir_rows.items():
    my_cid = coord_id_by_uid.get(uid)
    c_id   = dir_to_sup.get(my_cid, fallback_cid)
    # Los dirigentes no tienen otro dirigente sobre ellos → d_id = None
    dnombre = str(row.get("DIRIGENTE","")).strip().upper()
    d_id    = nombre_to_cid.get(dnombre) if dnombre and dnombre not in ("","NAN","NONE") else None
    mil_x.append(mk_mil(uid, row, c_id, d_id))
    if P_MIL: up_x.append({"usuario_id":uid,"perfil_id":P_MIL,
                            "es_principal":False,"activo":True})

insert("militantes",     mil_x, batch=100)
insert("usuario_perfil", up_x,  batch=100)
print(f"  ✅ {len(mil_x)} coord/dir en militantes  |  total mil BD: {count('militantes')}")

# ── 15. RESUMEN FINAL ────────────────────────────────────────────
print("\n" + "=" * 62)
print("  📊  RESUMEN FINAL")
print("=" * 62)
for t in ["usuarios","coordinadores","militantes","dirigentes",
          "ciudades","localidades","barrios",
          "perfiles","permisos","modulos","perfil_permiso_modulo"]:
    print(f"  • {t:<26}: {count(t):>6} registros")

# Verificar cuántos militantes tienen dirigente_id asignado
try:
    r_dir = requests.get(f"{BASE}/militantes?select=id&dirigente_id=not.is.null",
                         headers={**H, "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"},
                         verify=False, timeout=15)
    n_con_dir = r_dir.headers.get("Content-Range", "?/?").split("/")[-1]
    print(f"  • militantes con dirigente_id : {n_con_dir}")
except Exception as e:
    print(f"  • militantes con dirigente_id : (no se pudo verificar: {e})")

print()
print("  ESPERADO:")
print(f"  • usuarios      : {len(all_recs)}")
print(f"  • coordinadores : {len(coord_recs)+len(dir_recs)} "
      f"(coord={len(coord_recs)} + dir={len(dir_recs)})")
print(f"  • militantes    : ~{done_mil + len(mil_x)}")
print(f"  • dirigentes    : {len(dir_rels)} relaciones")
print()
print("  ⚠️  Recuerda ejecutar ASIGNAR_ADMIN.sql para re-ligar al admin")
print("  ✅  MIGRACIÓN COMPLETADA")
print("=" * 62)
