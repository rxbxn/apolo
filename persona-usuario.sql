create table public.usuarios (
  id uuid not null default extensions.uuid_generate_v4 (),
  tipo_documento character varying(20) null default 'Cédula'::character varying,
  numero_documento character varying(30) not null,
  nombres character varying(100) not null,
  apellidos character varying(100) not null,
  email character varying(255) null,
  foto_perfil_url text null,
  celular character varying(20) null,
  whatsapp character varying(20) null,
  telefono character varying(20) null,
  direccion text null,
  barrio_id uuid null,
  barrio_nombre character varying(100) null,
  localidad_id uuid null,
  localidad_nombre character varying(100) null,
  ciudad_id uuid null,
  ciudad_nombre character varying(100) null,
  fecha_nacimiento date null,
  lugar_nacimiento character varying(100) null,
  genero character varying(20) null,
  estado_civil character varying(30) null,
  numero_hijos integer null default 0,
  nivel_escolaridad character varying(50) null,
  perfil_ocupacion character varying(100) null,
  tipo_vivienda character varying(50) null,
  talla_camisa character varying(10) null,
  facebook character varying(255) null,
  twitter character varying(255) null,
  instagram character varying(255) null,
  nombre_familiar_cercano character varying(200) null,
  celular_familiar_cercano character varying(20) null,
  referencia_id character varying(100) null,
  telefono_referencia character varying(20) null,
  ubicacion character varying(200) null,
  cargo_actual character varying(100) null,
  beneficiario character varying(100) null,
  zona_id uuid null,
  zona_nombre character varying(100) null,
  compromiso_marketing integer null default 0,
  compromiso_impacto integer null default 0,
  compromiso_cautivo integer null default 0,
  latitud numeric(10, 8) null,
  longitud numeric(11, 8) null,
  auth_user_id uuid null,
  ultimo_acceso timestamp with time zone null,
  estado character varying(20) null default 'activo'::character varying,
  creado_en timestamp with time zone null default now(),
  actualizado_en timestamp with time zone null default now(),
  creado_por uuid null,
  actualizado_por uuid null,
  compromiso_privado character varying(100) null,
  observaciones text null,
  tiene_hijos boolean null default false,
  estrato character varying(20) null,
  ingresos_rango character varying(50) null,
  lider_responsable character varying(255) null,
  referido_por character varying(255) null,
  telefono_fijo character varying(20) null,
  linkedin character varying(255) null,
  tiktok character varying(255) null,
  tipo_referencia_id uuid null,
  grupo_etnico uuid null,
  constraint usuarios_pkey primary key (id),
  constraint usuarios_numero_documento_key unique (numero_documento),
  constraint usuarios_email_key unique (email),
  constraint usuarios_actualizado_por_fkey foreign KEY (actualizado_por) references usuarios (id),
  constraint usuarios_tipo_referencia_id_fkey foreign KEY (tipo_referencia_id) references tipos_referencia (id) on delete set null,
  constraint usuarios_auth_user_id_fkey foreign KEY (auth_user_id) references auth.users (id) on delete CASCADE,
  constraint usuarios_creado_por_fkey foreign KEY (creado_por) references usuarios (id),
  constraint usuarios_barrio_id_fkey foreign KEY (barrio_id) references barrios (id) on delete set null,
  constraint usuarios_localidad_id_fkey foreign KEY (localidad_id) references localidades (id) on delete set null,
  constraint usuarios_ciudad_id_fkey foreign KEY (ciudad_id) references ciudades (id) on delete set null,
  constraint usuarios_zona_id_fkey foreign KEY (zona_id) references zonas (id) on delete set null,
  constraint chk_estado check (
    (
      (estado)::text = any (
        (
          array[
            'activo'::character varying,
            'inactivo'::character varying,
            'suspendido'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint chk_genero check (
    (
      (genero)::text = any (
        (
          array[
            'Masculino'::character varying,
            'Femenino'::character varying,
            'Otro'::character varying,
            'Género'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_usuarios_documento on public.usuarios using btree (numero_documento) TABLESPACE pg_default;

create index IF not exists idx_usuarios_tipo_documento on public.usuarios using btree (tipo_documento) TABLESPACE pg_default;

create index IF not exists idx_usuarios_email on public.usuarios using btree (email) TABLESPACE pg_default;

create index IF not exists idx_usuarios_estado on public.usuarios using btree (estado) TABLESPACE pg_default;

create index IF not exists idx_usuarios_zona on public.usuarios using btree (zona_id) TABLESPACE pg_default;

create index IF not exists idx_usuarios_localidad on public.usuarios using btree (localidad_id) TABLESPACE pg_default;

create index IF not exists idx_usuarios_ciudad on public.usuarios using btree (ciudad_id) TABLESPACE pg_default;

create index IF not exists idx_usuarios_barrio on public.usuarios using btree (barrio_id) TABLESPACE pg_default;

create index IF not exists idx_usuarios_nombres_apellidos on public.usuarios using btree (nombres, apellidos) TABLESPACE pg_default;

create index IF not exists idx_usuarios_auth_user on public.usuarios using btree (auth_user_id) TABLESPACE pg_default;

create trigger trigger_actualizar_usuarios BEFORE
update on usuarios for EACH row
execute FUNCTION actualizar_timestamp ();




-------------------------------------------------------
---tabla persona---------
-------------------------
create table persona (
    id bigint generated by default as identity primary key,

    celular text,
    estado text, -- activo | inactivo | suspendido
    fecha date,

    cedula text,
    persona text,
    coordinador text,
    dirigente text,
    tipo text,
    talla text,
    lugar_nacimiento text,
    direccion text,
    telefono text,

    ciudad text,
    barrio text,
    localidad text,
    nacimiento date,
    genero text,
    email text,

    referencia text,
    tel_referencia text,
    vivienda text,

    facebook text,
    instagram text,
    twitter text,
    whatsapp text,

    estudios text,
    ocupacion text,

    comp_difusion integer,
    comp_marketing integer,
    comp_impacto integer,
    comp_cautivo integer,
    comp_proyecto integer,

    verificacion_sticker text, -- SI / NO
    fecha_verificacion_sticker timestamp,
    observacion_verificacion_sticker text,
    nombre_verificador text,

    beneficiario text
);
