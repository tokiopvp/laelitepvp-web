/**
 * Diagnóstico temporal del despliegue.
 *
 * POR QUE EXISTE
 * --------------
 * El JS publicado sigue apuntando a supabase.co despues de cambiar
 * `NEXT_PUBLIC_SUPABASE_URL`, y desde fuera no hay forma de saber por que:
 * puede ser que la variable este en Preview y no en Production, que el build
 * sea anterior al cambio, o que este en otro proyecto de Cloudflare. Ya paso
 * antes en este proyecto -las variables estaban en `laelitepvp-web` y el
 * dominio lo servia `laelitepvp-we`- y se perdio un buen rato adivinando.
 *
 * NO ENSEÑA NINGUN SECRETO
 * ------------------------
 * De cada variable solo sale si EXISTE y, cuando es una URL, su dominio. Ni
 * claves, ni tokens, ni valores completos. Aun asi es temporal: se borra en
 * cuanto quede claro que pasa.
 */

/** Solo el dominio de una URL, o una etiqueta si no lo es. */
function dominio(v) {
  if (!v) return null
  try {
    return new URL(v).host + new URL(v).pathname.replace(/\/$/, '')
  } catch {
    return '(no es una URL)'
  }
}

export async function onRequest({ env }) {
  const datos = {
    // Lo que ve la FUNCION en tiempo de ejecucion.
    funciones: {
      SUPABASE_URL: dominio(env.SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_URL: dominio(env.NEXT_PUBLIC_SUPABASE_URL),
      tiene_service_role: !!env.SUPABASE_SERVICE_ROLE_KEY,
      tiene_anon: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    // Que despliegue es este. Si el commit no es el ultimo, el build es viejo.
    despliegue: {
      proyecto: env.CF_PAGES_URL || null,
      rama: env.CF_PAGES_BRANCH || null,
      commit: (env.CF_PAGES_COMMIT_SHA || '').slice(0, 7) || null,
    },
  }
  return new Response(JSON.stringify(datos, null, 2), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
