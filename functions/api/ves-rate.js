// La Elite PvP - Tipo de cambio USDT/VES en vivo desde Binance P2P
// GET /api/ves-rate  -> { rate: number|null, updated: number }

const CACHE = { rate: null, at: 0 }
const TTL = 60_000

async function fetchVesRate() {
  const now = Date.now()
  if (CACHE.rate != null && now - CACHE.at < TTL) return CACHE.rate
  const body = JSON.stringify({
    fiat: 'VES',
    page: 1,
    rows: 5,
    tradeType: 'BUY',
    asset: 'USDT',
    countries: ['VE'],
  })
  const resp = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/ocbs/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: '*/*' },
    body,
  })
  const json = await resp.json()
  const adv = json?.data?.[0]?.advList?.[0]
  const price = adv ? parseFloat(adv.price) : null
  if (price && !isNaN(price)) {
    CACHE.rate = price
    CACHE.at = now
  }
  return CACHE.rate
}

export async function onRequestGet() {
  try {
    const rate = await fetchVesRate()
    return Response.json({ rate, updated: Date.now() })
  } catch {
    return Response.json({ rate: null, updated: Date.now() })
  }
}

export async function onRequestPost() {
  return onRequestGet()
}
