// Aviso de pedidos y actividad de la tienda a Discord y a Telegram.
//
// El webhook de Discord vive en DISCORD_WEBHOOK_URL y el bot de Telegram en
// TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID, siempre como variables de entorno de
// Cloudflare Pages: cualquiera con esas credenciales puede publicar en tu canal.
//
// Los dos destinos se disparan EN PARALELO y ninguno puede tumbar al otro: si
// Discord esta caido la venta igual te llega al telefono, que es el punto.

import { tg, esc, chatId, tecladoPedido } from '../_lib/telegram.js'

function embedDiscord(body, esVenta) {
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
    title: esVenta ? '🛒 Nuevo Pedido · La Elite PvP' : '⚡ Actividad · La Elite PvP',
    // Brasa para una venta, ceniza para el resto (identidad del sitio).
    color: esVenta ? 0xff5a1f : 0x8e8175,
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
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: esVenta ? '@here nuevo pedido en la tienda' : null,
        embeds: [embedDiscord(body, esVenta)],
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

  const refs = Array.isArray(body.orders) ? body.orders : [body.orders].filter(Boolean)
  const r = await tg(env, 'sendMessage', {
    chat_id: chat,
    text: esVenta ? textoVenta(body) : `⚡ <b>Actividad</b>\n${esc(body.action || body.type)}`,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    ...(esVenta && refs[0] ? { reply_markup: tecladoPedido(refs[0], body.ffid) } : {}),
  })
  return !!r.ok
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json()
    const env = context.env
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
