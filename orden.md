## Error Type
Console Error

## Error Message
Error cargando usuario: {}


    at cargarUsuario (lib/hooks/use-usuario.ts:52:25)

## Code Frame
  50 |                 }
  51 |             } catch (err) {
> 52 |                 console.error('Error cargando usuario:', err)
     |                         ^
  53 |                 setError(err instanceof Error ? err : new Error('Error desconocido'))
  54 |             } finally {
  55 |                 setLoading(false)

Next.js version: 16.1.1 (Turbopack)


cuando usamos el pencil amarillo o salmon este nos abre un modal el cual debe estar sincronizado con la tabla de personas, es decir, y tambien la que guarda los compromisos aqui te dejo las credenciales de supabase