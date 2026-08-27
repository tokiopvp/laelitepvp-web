// Aviso a Discord de pedidos y actividad de la tienda.
//
// El webhook vive en la variable de entorno DISCORD_WEBHOOK_URL de Cloudflare
// Pages, nunca en el codigo: cualquiera con esa URL puede publicar en el canal.

export async function onRequestPost(context) {
  try {
    const body = await context.request.json()
    const url = context.env.DISCORD_WEBHOOK_URL
    if (!url) {
      return Response.json({ ok: false, reason: 'no-webhook-configured' })
    }

    const isPurchase = body.type === 'purchase'

    const fields = [
      { name: '👤 Cliente', value: String(body.customer || '—'), inline: true },
      { name: '🎮 FF ID', value: String(body.ffid || '—'), inline: true },
      { name: '🌎 País', value: String(body.pais || '—'), inline: true },
      { name: '💳 Método', value: String(body.method || '—'), inline: true },
    ]

    // El total en la moneda del cliente es lo que hace falta para cobrarle.
    // Con solo el dolar hay que hacer la cuenta a mano cada vez.
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

    const embed = {
      title: isPurchase ? '🛒 Nuevo Pedido · La Elite PvP' : '⚡ Actividad · La Elite PvP',
      // Brasa para una venta, ceniza para el resto (identidad del sitio).
      color: isPurchase ? 0xff5a1f : 0x8e8175,
      fields,
      footer: { text: 'La Elite PvP · PagoStore' },
      timestamp: new Date().toISOString(),
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // content ademas del embed: dispara la notificacion del movil, que es
      // el punto de todo esto (atender al cliente rapido).
      body: JSON.stringify({
        content: isPurchase ? '@here nuevo pedido en la tienda' : null,
        embeds: [embed],
      }),
    })

    return Response.json({ ok: res.ok })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) })
  }
}
