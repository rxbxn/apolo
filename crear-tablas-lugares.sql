create table public.barrios (
  id uuid not null default extensions.uuid_generate_v4 (),
  nombre character varying(100) not null,
  codigo character varying(20) null,
  localidad_id uuid null,
  ciudad_id uuid null,
  activo boolean null default true,
  orden integer null,
  creado_en timestamp with time zone null default now(),
  actualizado_en timestamp with time zone null default now(),
  constraint barrios_pkey primary key (id),
  constraint barrios_nombre_localidad_id_key unique (nombre, localidad_id),
  constraint barrios_localidad_id_fkey foreign KEY (localidad_id) references localidades (id) on delete CASCADE,
  constraint barrios_ciudad_id_fkey foreign KEY (ciudad_id) references ciudades (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_barrios_nombre on public.barrios using btree (nombre) TABLESPACE pg_default;

create index IF not exists idx_barrios_localidad on public.barrios using btree (localidad_id) TABLESPACE pg_default;

create index IF not exists idx_barrios_ciudad on public.barrios using btree (ciudad_id) TABLESPACE pg_default;

create index IF not exists idx_barrios_activo on public.barrios using btree (activo) TABLESPACE pg_default;

create trigger trigger_actualizar_barrios BEFORE
update on barrios for EACH row
execute FUNCTION actualizar_timestamp ();

----------------------------------------------------
create table public.ciudades (
  id uuid not null default extensions.uuid_generate_v4 (),
  nombre character varying(100) not null,
  codigo character varying(20) null,
  activo boolean null default true,
  orden integer null,
  creado_en timestamp with time zone null default now(),
  actualizado_en timestamp with time zone null default now(),
  constraint ciudades_pkey primary key (id),
  constraint ciudades_nombre_key unique (nombre)
) TABLESPACE pg_default;

create index IF not exists idx_ciudades_nombre on public.ciudades using btree (nombre) TABLESPACE pg_default;

create index IF not exists idx_ciudades_activo on public.ciudades using btree (activo) TABLESPACE pg_default;

create trigger trigger_actualizar_ciudades BEFORE
update on ciudades for EACH row
execute FUNCTION actualizar_timestamp ();
------------------------------------------------
create table public.localidades (
  id uuid not null default extensions.uuid_generate_v4 (),
  nombre character varying(100) not null,
  codigo character varying(20) null,
  ciudad_id uuid null,
  activo boolean null default true,
  orden integer null,
  creado_en timestamp with time zone null default now(),
  actualizado_en timestamp with time zone null default now(),
  constraint localidades_pkey primary key (id),
  constraint localidades_nombre_ciudad_id_key unique (nombre, ciudad_id),
  constraint localidades_ciudad_id_fkey foreign KEY (ciudad_id) references ciudades (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_localidades_nombre on public.localidades using btree (nombre) TABLESPACE pg_default;

create index IF not exists idx_localidades_ciudad on public.localidades using btree (ciudad_id) TABLESPACE pg_default;

create index IF not exists idx_localidades_activo on public.localidades using btree (activo) TABLESPACE pg_default;

create trigger trigger_actualizar_localidades BEFORE
update on localidades for EACH row
execute FUNCTION actualizar_timestamp ();