-- Hipótesis: al crear la cuenta de Auth para este coordinador se usó un
-- correo distinto al que tiene la persona en su ficha (usuarios.email), y
-- eso pudo generar un coordinador/usuario DUPLICADO (fila nueva) en vez de
-- vincularse a la persona real que ya tenía militantes asignados. Es el
-- mismo patrón que ya se dio antes con el import (ver tarea "Fusionar
-- coordinadores placeholder duplicados con su persona real").

-- 1) Ver la ficha completa detrás de este coordinador: su usuario_id, el
-- nombre real de la persona, y si el email de coordinadores (login) coincide
-- con el email de usuarios (ficha personal).
select
  c.id as coordinador_id,
  c.email as email_login_coordinador,
  c.usuario_id,
  u.nombres,
  u.apellidos,
  u.email as email_ficha_personal,
  u.numero_documento,
  u.creado_en as usuario_creado_en
from coordinadores c
join usuarios u on u.id = c.usuario_id
where c.email = 'ecosomostodos2@gmail.com';

-- 2) Buscar posibles duplicados: otro usuario/coordinador con nombre
-- parecido (ajusta el ilike con el nombre real que arroje la consulta 1,
-- por ejemplo si la persona se llama "Juan Pérez" busca '%juan%perez%').
-- Aquí un ejemplo genérico buscando coincidencias por documento primero
-- (más confiable que el nombre):
select
  c.id as coordinador_id,
  c.email as email_login_coordinador,
  u.id as usuario_id,
  u.nombres,
  u.apellidos,
  u.numero_documento,
  u.email as email_ficha_personal,
  (select count(*) from militantes m where m.coordinador_id = c.id) as total_militantes
from coordinadores c
join usuarios u on u.id = c.usuario_id
where u.numero_documento = (
  select numero_documento from usuarios
  where id = (select usuario_id from coordinadores where email = 'ecosomostodos2@gmail.com')
)
order by u.creado_en;

-- 3) Si la consulta 2 solo devuelve una fila (esta misma), buscar por
-- nombre similar en vez de documento (por si el documento también quedó
-- distinto entre las dos fichas duplicadas):
select
  c.id as coordinador_id,
  c.email as email_login_coordinador,
  u.id as usuario_id,
  u.nombres,
  u.apellidos,
  u.numero_documento,
  u.email as email_ficha_personal,
  (select count(*) from militantes m where m.coordinador_id = c.id) as total_militantes
from coordinadores c
join usuarios u on u.id = c.usuario_id
where u.nombres ilike '%' || (
  select split_part(nombres, ' ', 1) from usuarios
  where id = (select usuario_id from coordinadores where email = 'ecosomostodos2@gmail.com')
) || '%'
order by u.creado_en;
