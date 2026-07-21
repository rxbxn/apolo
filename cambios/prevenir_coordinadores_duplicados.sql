-- Defensa a nivel de base de datos contra el bug de coordinadores
-- duplicados (mismo usuario_id en dos filas de coordinadores), además
-- del bloqueo que ya se agregó en el código (use-coordinadores.ts::crear()).

-- 1) DIAGNÓSTICO: ¿quedan otros usuario_id con más de un coordinador?
-- (además del caso de ECO SOMOS TODOS 2, que ya se fusionó)
select usuario_id, count(*) as total_coordinadores, array_agg(email) as emails
from coordinadores
group by usuario_id
having count(*) > 1;

-- 2) Si la consulta anterior no devuelve ninguna fila, es seguro aplicar
-- la restricción UNIQUE real (evita que esto vuelva a pasar aunque falle
-- la validación del código en el futuro):
alter table coordinadores
  add constraint coordinadores_usuario_id_unique unique (usuario_id);

-- Si el paso 2 falla con "duplicate key value violates unique constraint",
-- significa que el diagnóstico del paso 1 sí encontró más casos —
-- fusiónalos primero (mismo patrón que
-- cambios/fusionar_coordinador_ecosomostodos2.sql) y vuelve a intentar.
