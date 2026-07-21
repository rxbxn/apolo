-- Verifica cuántos militantes tiene asignados el coordinador
-- "ECO SOMOS TODOS 2" (fabrizioemiliani@gmail.com), y lista sus nombres.

-- 1) Conteo rápido
select
  c.id as coordinador_id,
  c.email,
  c.auth_user_id,
  count(m.id) as total_militantes
from coordinadores c
left join militantes m on m.coordinador_id = c.id
where c.email = 'fabrizioemiliani@gmail.com'
group by c.id, c.email, c.auth_user_id;

-- 2) Detalle: cada militante asignado a este coordinador (si hay)
select
  m.id as militante_id,
  u.nombres,
  u.apellidos,
  u.numero_documento,
  m.estado
from militantes m
join coordinadores c on c.id = m.coordinador_id
join usuarios u on u.id = m.usuario_id
where c.email = 'fabrizioemiliani@gmail.com'
order by u.nombres, u.apellidos;
