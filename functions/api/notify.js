// Avisos al movil: SOLO ventas y solicitudes de ingreso al clan.
//
// El webhook de Discord vive en DISCORD_WEBHOOK_URL y el bot de Telegram en
// TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID, siempre como variables de entorno de
// Cloudflare Pages: cualquiera con esas credenciales puede publicar en tu canal.
//
// Los dos destinos se disparan EN PARALELO y ninguno puede tumbar al otro: si
// Discord esta caido la venta igual te llega al telefono, que es el punto.

import { tg, esc, chatId, tecladoPedido } from '../_lib/telegram.js'

function embedDiscord(body) {
  const fields = [
    { name: '👤 Cliente', value: String(body.customer || '—'), inline: true },
    { name: '🎮 FF ID', value: String(body.ffid || '—'), inline: true },
    { name: '🌎 País', value: String(body.pais || '—'), inline: true },
    { name: '💳 Método', value: String(body.method || '—'), inline: true },
  ]
  if (body.total_local) {
    fields.push({
      name: `💵 A cobrar (${body.moneda || 'local'})`,
      value: String(body.total_local),
      inline: true,
    })
  }
  fields.push({
    name: '💰 Total USD',
    value: body.total ? '$' + Number(body.total).toFixed(2) : '—',
    inline: true,
  })
  if (body.whatsapp) {
    fields.push({ name: '📱 Contacto', value: String(body.whatsapp), inline: true })
  }
  fields.push({
    name: '🧾 Pedido(s)',
    value: Array.isArray(body.orders) ? body.orders.join(', ') : String(body.orders || '—'),
    inline: false,
  })
  return {
    title: '🛒 Nuevo Pedido · La Elite PvP',
    // Brasa: el color de la marca para lo que urge.
    color: 0xff5a1f,
    fields,
    footer: { text: 'La Elite PvP · PagoStore' },
    timestamp: new Date().toISOString(),
  }
}

async function aDiscord(env, body, esVenta) {
  const url = env.DISCORD_WEBHOOK_URL
  if (!url) return false
  // Las postulaciones se atienden desde Telegram, que es donde esta el boton de
  // WhatsApp. En Discord solo se deja constancia.
  if (body.type === 'application') {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🎯 Nueva solicitud de ingreso',
            description: `**${body.nickname || '—'}** · FF ID \`${body.free_fire_id || '—'}\``,
            color: 0xe8b33c,
            timestamp: new Date().toISOString(),
          }],
        }),
      })
      return res.ok
    } catch {
      return false
    }
  }
  if (!esVenta) return false
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '@here nuevo pedido en la tienda',
        embeds: [embedDiscord(body)],
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

function textoVenta(body) {
  const refs = Array.isArray(body.orders) ? body.orders : [body.orders].filter(Boolean)
  const lineas = [
    '🛒 <b>NUEVA VENTA</b> · La Elite PvP',
    '',
    `👤 <b>${esc(body.customer)}</b>`,
    `🎮 FF ID: <code>${esc(body.ffid)}</code>`,
    `🌎 ${esc(body.pais)}   💳 ${esc(body.method)}`,
  ]
  if (body.total_local) {
    lineas.push(`💵 <b>A cobrar: ${esc(body.total_local)} ${esc(body.moneda || '')}</b>`)
  }
  lineas.push(`💰 Total USD: <b>$${Number(body.total || 0).toFixed(2)}</b>`)
  if (body.whatsapp) lineas.push(`📱 ${esc(body.whatsapp)}`)
  if (body.detalle) lineas.push(`📦 ${esc(body.detalle)}`)
  lineas.push('', `🧾 <code>${esc(refs.join(', '))}</code>`)
  lineas.push('', '<i>Pulsa Aceptar y entrega los diamantes.</i>')
  return lineas.join('\n')
}

/**
 * Aviso de postulacion al clan.
 *
 * Lleva boton directo de WhatsApp porque lo que decide si alguien entra al clan
 * es que le escriban PRONTO: una solicitud contestada al dia siguiente ya se
 * fue a otro clan. El enlace `wa.me` abre la conversacion con el mensaje
 * escrito, asi que atenderla es un toque.
 */
function textoPostulacion(b) {
  const lineas = [
    '🎯 <b>NUEVA SOLICITUD DE INGRESO</b>',
    '',
    `👤 <b>${esc(b.nickname)}</b>`,
    `🎮 FF ID: <code>${esc(b.free_fire_id)}</code>`,
  ]
  if (b.rank) lineas.push(`🏅 Rango: ${esc(b.rank)}`)
  if (b.age) lineas.push(`🎂 Edad: ${esc(b.age)}`)
  if (b.whatsapp) lineas.push(`📱 ${esc(b.whatsapp)}`)
  if (b.discord) lineas.push(`💬 Discord: ${esc(b.discord)}`)
  if (b.experience) lineas.push('', `📝 ${esc(String(b.experience).slice(0, 400))}`)
  lineas.push('', '<i>Revisa y responde en /admin/postulaciones</i>')
  return lineas.join('\n')
}

function tecladoPostulacion(b) {
  const filas = []
  const digitos = String(b.whatsapp || '').replace(/\D/g, '')
  if (digitos.length >= 8) {
    const saludo = encodeURIComponent(
      `Hola ${b.nickname || ''}, somos La Elite PvP. Vimos tu solicitud para entrar al clan.`
    )
    filas.push([{ text: '📱 Escribirle por WhatsApp', url: `https://wa.me/${digitos}?text=${saludo}` }])
  }
  filas.push([{ text: '🗂 Ver postulaciones', url: 'https://www.laelitepvp.com/admin/postulaciones' }])
  return { inline_keyboard: filas }
}

async function aTelegram(env, body, esVenta) {
  const chat = chatId(env)
  if (!chat) return false

  if (body.type === 'application') {
    const r = await tg(env, 'sendMessage', {
      chat_id: chat,
      text: textoPostulacion(body),
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      reply_markup: tecladoPostulacion(body),
    })
    return !!r.ok
  }

  // SOLO ventas y solicitudes de ingreso.
  //
  // Antes cualquier otro tipo caia en un aviso generico de "Actividad", y eso
  // convertia el chat en ruido: cuando todo avisa, nada avisa, y la venta -que
  // es lo unico que urge- queda enterrada entre mensajes que nadie lee.
  if (!esVenta) return false

  const refs = Array.isArray(body.orders) ? body.orders : [body.orders].filter(Boolean)
  const r = await tg(env, 'sendMessage', {
    chat_id: chat,
    text: textoVenta(body),
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    ...(refs[0] ? { reply_markup: tecladoPedido(refs[0], body.ffid) } : {}),
  })
  return !!r.ok
}

/**
 * Comprueba en la base de datos que el aviso corresponde a algo REAL.
 *
 * ESTE ES EL CERROJO PRINCIPAL
 * ----------------------------
 * Esta URL es publica y tiene que serlo: la llama el navegador del cliente
 * justo despues de comprar. Sin comprobacion, cualquiera con una terminal podia
 * inundar el telefono del dueño con ventas inventadas, y una venta de verdad
 * quedaba enterrada entre el ruido. No es un robo de datos, pero deja el
 * negocio ciego, que a efectos practicos es peor.
 *
 * La defensa no es un secreto -en el navegador no hay secretos que valgan- sino
 * COMPROBAR: un aviso de venta solo sale si ese numero de pedido existe de
 * verdad, y uno de solicitud solo si esa postulacion esta guardada. Para
 * falsificar un aviso habria que crear antes el pedido, y entonces ya no es
 * falso.
 */
async function esReal(env, body) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  // Sin credenciales no se puede comprobar. Se deja pasar en vez de bloquear:
  // quedarse sin avisos de venta por un fallo de configuracion es peor que el
  // riesgo de spam, y el resto de frenos siguen puestos.
  if (!url || !key) return true

  const cabeceras = { apikey: key, Authorization: `Bearer ${key}` }
  try {
    if (body.type === 'purchase') {
      const refs = Array.isArray(body.orders) ? body.orders : [body.orders].filter(Boolean)
      if (!refs.length) return false
      const r = await fetch(
        `${url}/rest/v1/orders?order_number=eq.${encodeURIComponent(refs[0])}&select=order_number`,
        { headers: cabeceras }
      )
      const filas = await r.json()
      return Array.isArray(filas) && filas.length > 0
    }

    if (body.type === 'application') {
      if (!body.free_fire_id) return false
      // Ademas de existir, tiene que ser RECIENTE: si no, alguien podria
      // repetir el aviso de una solicitud vieja una y otra vez.
      const hace5min = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const r = await fetch(
        `${url}/rest/v1/applications?free_fire_id=eq.${encodeURIComponent(body.free_fire_id)}` +
          `&created_at=gte.${hace5min}&select=id`,
        { headers: cabeceras }
      )
      const filas = await r.json()
      return Array.isArray(filas) && filas.length > 0
    }
  } catch {
    // Si la comprobacion falla por red, se deja pasar: perder el aviso de una
    // venta real es un daño mayor que un aviso de mas.
    return true
  }
  return false
}

/**
 * Freno por IP. Segunda linea, para el caso de que alguien cree pedidos reales
 * en bucle solo para hacer sonar el telefono.
 */
const VISTOS = new Map()
function demasiadoRapido(ip) {
  const ahora = Date.now()
  if (VISTOS.size > 800) {
    for (const [k, t] of VISTOS) if (ahora - t.hasta < ahora) VISTOS.delete(k)
  }
  const v = VISTOS.get(ip)
  if (!v || ahora > v.hasta) {
    VISTOS.set(ip, { n: 1, hasta: ahora + 60_000 })
    return false
  }
  v.n += 1
  return v.n > 8 // mas de ocho avisos por minuto desde una IP no es una persona
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json()
    const env = context.env

    // Solo se atienden los dos tipos que avisan. Cualquier otra cosa se
    // descarta antes de tocar la base de datos.
    if (body.type !== 'purchase' && body.type !== 'application') {
      return Response.json({ ok: false, reason: 'tipo-no-admitido' })
    }

    const ip = context.request.headers.get('cf-connecting-ip') || 'anon'
    if (demasiadoRapido(ip)) {
      return Response.json({ ok: false, reason: 'demasiadas-peticiones' })
    }

    if (!(await esReal(env, body))) {
      return Response.json({ ok: false, reason: 'no-verificado' })
    }

    const esVenta = body.type === 'purchase'
    const [discord, telegram] = await Promise.all([
      aDiscord(env, body, esVenta),
      aTelegram(env, body, esVenta),
    ])

    return Response.json({ ok: discord || telegram, discord, telegram })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) })
  }
}
