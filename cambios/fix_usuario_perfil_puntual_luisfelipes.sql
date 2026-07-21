-- Fix puntual para luisfelipes277@gmail.com (usuario_id 7e5a3a8d-6dda-4eaf-930d-e5ef546aac82)
-- Mismo patrón que fix_usuario_perfil_desincronizado.sql: crea/activa la fila en
-- usuario_perfil que falta, reflejando el perfil_id que ya tiene en coordinadores.

-- 1) Desactivar cualquier perfil viejo que pudiera tener activo (por si acaso)
update usuario_perfil
set activo = false, fecha_revocacion = now()
where usuario_id = '7e5a3a8d-6dda-4eaf-930d-e5ef546aac82'
  and activo = true;

-- 2) Insertar/activar el perfil correcto según coordinadores
insert into usuario_perfil (usuario_id, perfil_id, es_principal, activo)
select c.usuario_id, c.perfil_id, true, true
from coordinadores c
where c.usuario_id = '7e5a3a8d-6dda-4eaf-930d-e5ef546aac82'
  and c.perfil_id is not null
on conflict (usuario_id, perfil_id)
do update set activo = true, es_principal = true, fecha_revocacion = null;

-- 3) Verificación
select up.usuario_id, p.nombre as perfil, up.activo, up.es_principal
from usuario_perfil up
join perfiles p on p.id = up.perfil_id
where up.usuario_id = '7e5a3a8d-6dda-4eaf-930d-e5ef546aac82';
