export async function onRequestPost(context) {
  try {
    const body = await context.request.json()
    const url = context.env.DISCORD_WEBHOOK_URL
    if (!url) {
      return Response.json({ ok: false, reason: 'no-webhook-configured' })
    }

    const isPurchase = body.type === 'purchase'
    const embed = {
      title: isPurchase ? '🛒 Nuevo Pedido · La Elite PvP' : '⚡ Actividad · La Elite PvP',
      color: isPurchase ? 0x00d4ff : 0x7c3aed,
      fields: [
        { name: '👤 Cliente', value: String(body.customer || '—'), inline: true },
        { name: '🎮 FF ID', value: String(body.ffid || '—'), inline: true },
        { name: '💳 Método', value: String(body.method || '—'), inline: true },
        { name: '💰 Total', value: body.total ? '$' + Number(body.total).toFixed(2) : '—', inline: true },
        {
          name: '🧾 Pedido(s)',
          value: Array.isArray(body.orders) ? body.orders.join(', ') : String(body.orders || '—'),
          inline: false,
        },
      ],
      footer: { text: 'La Elite PvP · PagoStore' },
      timestamp: new Date().toISOString(),
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })

    return Response.json({ ok: res.ok })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) })
  }
}
