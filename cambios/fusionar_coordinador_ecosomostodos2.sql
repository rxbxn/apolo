-- Fusiona los dos coordinadores duplicados de "ECO SOMOS TODOS 2"
-- (mismo usuario_id: ed9aea52-b354-4ba9-9acd-baf5956f8485):
--   - 9460e2f9-44ca-4990-83ea-e02871ca9b5f  -> tiene los 29 militantes reales
--   - bb789ef2-6563-4c8f-bf87-22fab52f75ce  -> el login real (ecosomostodos2@gmail.com), 0 militantes
--
-- Estrategia: redirigir cualquier cosa que pudiera apuntar a la fila vacía
-- (defensivo, aunque hoy tiene 0 militantes) hacia la fila real, luego
-- borrar la fila vacía, y por último mover el email + auth_user_id reales
-- a la fila que sí tiene los militantes. El orden importa: el email es
-- UNIQUE, así que hay que liberar el email borrando la fila duplicada
-- ANTES de asignárselo a la fila buena.

begin;

-- 1) Redirigir referencias que pudieran apuntar a la fila vacía (defensivo)
update militantes set coordinador_id = '9460e2f9-44ca-4990-83ea-e02871ca9b5f'
where coordinador_id = 'bb789ef2-6563-4c8f-bf87-22fab52f75ce';

update militantes set dirigente_id = '9460e2f9-44ca-4990-83ea-e02871ca9b5f'
where dirigente_id = 'bb789ef2-6563-4c8f-bf87-22fab52f75ce';

update dirigentes set id_coordinador = '9460e2f9-44ca-4990-83ea-e02871ca9b5f'
where id_coordinador = 'bb789ef2-6563-4c8f-bf87-22fab52f75ce';

update dirigentes set id_dirigente = '9460e2f9-44ca-4990-83ea-e02871ca9b5f'
where id_dirigente = 'bb789ef2-6563-4c8f-bf87-22fab52f75ce';

update debate_planillas set coordinador_id = '9460e2f9-44ca-4990-83ea-e02871ca9b5f'
where coordinador_id = 'bb789ef2-6563-4c8f-bf87-22fab52f75ce';

update debate_inconsistencias set coordinador_id = '9460e2f9-44ca-4990-83ea-e02871ca9b5f'
where coordinador_id = 'bb789ef2-6563-4c8f-bf87-22fab52f75ce';

update debate_casa_estrategica set coordinador_id = '9460e2f9-44ca-4990-83ea-e02871ca9b5f'
where coordinador_id = 'bb789ef2-6563-4c8f-bf87-22fab52f75ce';

update debate_vehiculo_amigo set coordinador_id = '9460e2f9-44ca-4990-83ea-e02871ca9b5f'
where coordinador_id = 'bb789ef2-6563-4c8f-bf87-22fab52f75ce';

update debate_publicidad_vehiculo set coordinador_id = '9460e2f9-44ca-4990-83ea-e02871ca9b5f'
where coordinador_id = 'bb789ef2-6563-4c8f-bf87-22fab52f75ce';

update formularios_gestion set coordinador_id = '9460e2f9-44ca-4990-83ea-e02871ca9b5f'
where coordinador_id = 'bb789ef2-6563-4c8f-bf87-22fab52f75ce';

update coordinadores set referencia_coordinador_id = '9460e2f9-44ca-4990-83ea-e02871ca9b5f'
where referencia_coordinador_id = 'bb789ef2-6563-4c8f-bf87-22fab52f75ce';

-- 2) Borrar la fila duplicada vacía (esto libera el email único)
delete from coordinadores where id = 'bb789ef2-6563-4c8f-bf87-22fab52f75ce';

-- 3) Mover el login real (email + cuenta de Auth) a la fila con los militantes
update coordinadores
set email = 'ecosomostodos2@gmail.com',
    auth_user_id = 'b4b5d28d-ce1e-4569-ac26-d3730c3c2f53'
where id = '9460e2f9-44ca-4990-83ea-e02871ca9b5f';

commit;

-- 4) Verificación: debe quedar UNA sola fila, con el email real y 29 militantes
select
  c.id as coordinador_id,
  c.email,
  c.auth_user_id,
  count(m.id) as total_militantes
from coordinadores c
left join militantes m on m.coordinador_id = c.id
where c.usuario_id = 'ed9aea52-b354-4ba9-9acd-baf5956f8485'
group by c.id, c.email, c.auth_user_id;
