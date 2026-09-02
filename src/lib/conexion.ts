/**
 * Saber si el navegador está llegando a la base de datos.
 *
 * POR QUE HACE FALTA
 * ------------------
 * Todas las consultas hacían `if (error) return []`. Eso mezcla dos cosas que
 * no tienen nada que ver: "no hay miembros" y "no pude preguntar". El
 * resultado es que un jugador cuya red no resuelve el dominio de Supabase ve
 * la web entera cargada y en pie, con "0 MIEMBROS OFICIALES", cero tareas, el
 * mercado sin abrir y su saldo en cero.
 *
 * Pasó de verdad, con dos jugadores el mismo día. Yo mismo revisé la base
 * buscando un borrado que nunca hubo: los datos estaban intactos y la web se
 * veía vacía. Si la página hubiera dicho "no consigo conectar", el diagnóstico
 * habría durado diez segundos en vez de una hora.
 *
 * COMO SE DISTINGUE
 * -----------------
 * Un error de red en `fetch` no trae código HTTP: no llegó a hablar con nadie.
 * PostgREST, en cambio, siempre responde con un código. Esa es la frontera, y
 * es fiable sin depender del texto del mensaje, que cambia con cada navegador.
 */

type Escucha = (caido: boolean) => void

let caido = false
const escuchas = new Set<Escucha>()

/** Si la última consulta no consiguió salir a la red. */
export function sinConexion(): boolean {
  return caido
}

/**
 * Marca el estado y avisa a quien esté mirando.
 *
 * Se llama con `false` en cada consulta que SÍ funciona: así el aviso
 * desaparece solo en cuanto vuelve la red, sin que nadie recargue.
 */
export function marcarConexion(ok: boolean): void {
  const nuevo = !ok
  if (nuevo === caido) return
  caido = nuevo
  // forEach y no for-of: el target de compilacion no itera Set.
  escuchas.forEach((f) => f(caido))
}

export function alCambiarConexion(f: Escucha): () => void {
  escuchas.add(f)
  return () => escuchas.delete(f)
}

/**
 * Envuelve una consulta de Supabase y clasifica lo que devuelve.
 *
 * Devuelve `null` SOLO cuando no se pudo hablar con el servidor. Un error de
 * verdad de la base -permisos, columna que no existe- no es falta de conexión
 * y se devuelve como lista vacía, porque ahí la web sí tiene la respuesta
 * correcta: no hay nada que enseñar.
 */
export async function consultar<T>(
  p: PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>,
): Promise<T | null> {
  try {
    const { data, error } = await p
    if (error) {
      // Sin `code` no hubo respuesta HTTP: la petición no salió.
      const deRed = !error.code
      marcarConexion(!deRed)
      return deRed ? null : ([] as unknown as T)
    }
    marcarConexion(true)
    return data
  } catch {
    // `fetch` lanza cuando no hay red, DNS falla o lo bloquea el navegador.
    marcarConexion(false)
    return null
  }
}
