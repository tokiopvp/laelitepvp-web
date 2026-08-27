// La Elite PvP - Tasas USDT -> moneda local en vivo, desde Binance P2P.
//
// Reemplaza a /api/ves-rate, que solo cubria Venezuela. La logica es la misma
// que usa el bot de ventas en pricing.py: se piden los anuncios de gente que
// VENDE USDT y se toma el mejor precio disponible, luego se aplica el margen.
//
// GET /api/rates -> { rates: { VES: 245.1, COP: 4120, ... }, updated: <ms> }
//
// Devolver una tasa mal calculada es peor que no devolverla: la moneda que
// falle sale como null y la tienda muestra el precio en USD para ese pais.

const FIATS = ['VES', 'COP', 'MXN', 'PEN', 'CLP', 'ARS']  // USD no necesita tasa

// Margen a nuestro favor, igual que el bot. 1.00 = sin margen.
const MARGEN = 1.03

const CACHE = { rates: {}, at: 0 }
const TTL = 120_000  // 2 min: la tasa P2P no se mueve tanto y la API es lenta

async function tasaDe(fiat) {
  const resp = await fetch(
    'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        asset: 'USDT',
        fiat,
        tradeType: 'SELL',
        page: 1,
        rows: 5,
        payTypes: [],
        publisherType: null,
      }),
    }
  )
  if (!resp.ok) return null
  const json = await resp.json()
  const precios = (json?.data || [])
    .map((a) => parseFloat(a?.adv?.price))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (!precios.length) return null
  // El mejor precio para el cliente es el mas barato; encima va el margen.
  return Math.min(...precios) * MARGEN
}

export async function onRequestGet(context) {
  const ahora = Date.now()
  if (ahora - CACHE.at < TTL && Object.keys(CACHE.rates).length) {
    return Response.json({ rates: CACHE.rates, updated: CACHE.at, cached: true })
  }

  const resultados = await Promise.allSettled(FIATS.map(tasaDe))
  const rates = {}
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) rates[FIATS[i]] = r.value
  })

  // Si Binance falla entero, conservamos lo ultimo bueno en vez de vaciar la
  // tienda: una tasa de hace unos minutos sirve; ninguna, no.
  if (!Object.keys(rates).length && Object.keys(CACHE.rates).length) {
    return Response.json({ rates: CACHE.rates, updated: CACHE.at, stale: true })
  }

  CACHE.rates = rates
  CACHE.at = ahora
  return Response.json({ rates, updated: ahora })
}
