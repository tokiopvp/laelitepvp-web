// Aviso de pedidos y actividad de la tienda a Discord y a Telegram.
//
// El webhook de Discord vive en DISCORD_WEBHOOK_URL y el bot de Telegram en
// TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID, siempre como variables de entorno de
// Cloudflare Pages: cualquiera con esas credenciales puede publicar en tu canal.
//
// Los dos destinos se disparan EN PARALELO y ninguno puede tumbar al otro: si
// Discord esta caido la venta igual te llega al telefono, que es el punto.

import { tg, esc, chatId, tecladoPedido } from '../_lib/telegram.js'

/**
 * Ritmo de los avisos de visita.
 *
 * Sin freno, "alguien entro" se dispara en cada carga de cada pestaña y el chat
 * se vuelve ilegible: a los dos dias silencias el bot y te pierdes las VENTAS,
 * que es justo lo contrario de lo que se buscaba. Se avisa como mucho una vez
 * cada VISITA_MIN_MS por visitante, y el cliente ademas solo pide el aviso una
 * vez por sesion de navegador.
 */
const VISITA_MIN_MS = 10 * 60 * 1000
const visitasVistas = new Map()

function frenoVisita(clave) {
  const ahora = Date.now()
  // Poda barata: sin esto el Map crece sin limite en la instancia del worker.
  if (visitasVistas.size > 500) {
    for (const [k, t] of visitasVistas) if (ahora - t > VISITA_MIN_MS) visitasVistas.delete(k)
  }
  const previo = visitasVistas.get(clave)
  if (previo && ahora - previo < VISITA_MIN_MS) return false
  visitasVistas.set(clave, ahora)
  return true
}

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
  // Las visitas NO van a Discord: el canal es para atender ventas.
  if (body.type === 'visit') return false
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

function textoVisita(body) {
  return [
    '👀 <b>Alguien entró a la tienda</b>',
    body.pagina ? `📄 ${esc(body.pagina)}` : null,
    body.pais ? `🌎 ${esc(body.pais)}` : null,
    body.referrer ? `↩️ ${esc(body.referrer)}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

async function aTelegram(env, body, esVenta) {
  const chat = chatId(env)
  if (!chat) return false

  if (body.type === 'visit') {
    const r = await tg(env, 'sendMessage', {
      chat_id: chat,
      text: textoVisita(body),
      parse_mode: 'HTML',
      // Sin sonido: es contexto, no una venta. El aviso de venta si suena.
      disable_notification: true,
      link_preview_options: { is_disabled: true },
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

    if (body.type === 'visit') {
      // La IP del visitante solo se usa como clave del freno, en memoria y por
      // unos minutos. No se guarda ni se manda a ningun sitio.
      const clave =
        context.request.headers.get('cf-connecting-ip') || body.sesion || 'anon'
      if (!frenoVisita(clave)) return Response.json({ ok: true, skipped: 'rate-limit' })
    }

    const [discord, telegram] = await Promise.all([
      aDiscord(env, body, esVenta),
      aTelegram(env, body, esVenta),
    ])

    return Response.json({ ok: discord || telegram, discord, telegram })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) })
  }
}
