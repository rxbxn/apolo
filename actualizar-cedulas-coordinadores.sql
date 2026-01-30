-- Actualizar cédulas de coordinadores desde tabla persona
-- Solo para usuarios que tienen documentos COORD-* y cédulas válidas en persona

UPDATE usuarios
SET numero_documento = p.cedula,
    actualizado_en = NOW()
FROM persona p
WHERE UPPER(TRIM(p.persona)) = UPPER(TRIM(usuarios.nombres || ' ' || usuarios.apellidos))
  AND usuarios.numero_documento LIKE 'COORD-%'
  AND p.cedula IS NOT NULL
  AND p.cedula != ''
  AND p.cedula ~ '^[0-9]+$';

-- Verificar las actualizaciones realizadas
SELECT u.nombres, u.apellidos, u.numero_documento as documento_actualizado,
       p.cedula as cedula_persona, 'ACTUALIZADO' as estado
FROM usuarios u
INNER JOIN persona p ON UPPER(TRIM(p.persona)) = UPPER(TRIM(u.nombres || ' ' || u.apellidos))
WHERE u.numero_documento ~ '^[0-9]+$'
  AND u.numero_documento NOT LIKE 'COORD-%'
ORDER BY u.nombres;