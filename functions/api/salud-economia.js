// Alarma de salud del bot de Discord.
//
// PARA QUE SIRVE
// --------------
// El bot reparte las coins de voz desde el PC del equipo. Si el PC se apaga o
// el proceso se cuelga VIVO (como paso el 31/08, que paro de repartir
// estando "encendido"), nadie recibe sus +1 y nadie se entera hasta que los
// miembros lo notan.
//
// Este endpoint lo pincha un monitor gratis (UptimeRobot, cron-job.org) cada
// cinco minutos: 200 = el bot respira, 503 = esta caido y a el monitor le toca
// avisar.
//
// QUE MIRA
// --------
// La marca `eco.salud_bot` que el bot escribe en `settings` en cada latido,
// haya o no gente en voz. Mirar los repartos sola daria falsas alarmas de
// madrugada: a las 4 AM nadie esta conectado y el silencio es sano. La marca
// de vida no depende de que haya actividad.

const TOLERANCIA_MS = 2.5 * 60 * 1000 // dos latidos y medio

export async function onRequestGet(context) {
  const env = context.env
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY

  const cabeceras = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }

  if (!url || !key) {
    return new Response(
      JSON.stringify({ ok: false, error: 'faltan credenciales de Supabase' }),
      { status: 500, headers: cabeceras }
    )
  }

  try {
    const r = await fetch(
      `${url}/rest/v1/settings?key=eq.eco.salud_bot&select=updated_at,value`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cf: { cacheTtl: 0 },
      }
    )
    const filas = await r.json()
    const marca = Array.isArray(filas) && filas[0] ? filas[0].updated_at : null

    if (!marca) {
      return new Response(
        JSON.stringify({ ok: false, error: 'el bot nunca ha marcado vida' }),
        { status: 503, headers: cabeceras }
      )
    }

    const hace = Date.now() - new Date(marca).getTime()
    const vivo = hace < TOLERANCIA_MS

    return new Response(
      JSON.stringify({
        ok: vivo,
        visto_hace_segundos: Math.round(hace / 1000),
        ultimo_latido: marca,
      }),
      { status: vivo ? 200 : 503, headers: cabeceras }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: cabeceras }
    )
  }
}
