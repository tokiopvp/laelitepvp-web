/**
 * Los paises donde vendes, calcados de FreeFireBot/data/config.json.
 *
 * Estan aqui y no en Supabase a proposito: son ocho filas que cambian una vez
 * al año. Meterlas en la base obligaria a una tabla nueva, sus politicas RLS y
 * un sync mas, para ganar nada. Si algun dia se administran desde el panel,
 * este archivo pasa a ser el respaldo.
 */
export interface Pais {
  code: string
  nombre: string
  moneda: string      // ISO, el que pide /api/rates
  simbolo: string
  locale: string      // para el formato de miles y decimales
}

export const PAISES: Pais[] = [
  { code: 'VE', nombre: 'Venezuela', moneda: 'VES', simbolo: 'Bs', locale: 'es-VE' },
  { code: 'CO', nombre: 'Colombia', moneda: 'COP', simbolo: '$', locale: 'es-CO' },
  { code: 'MX', nombre: 'México', moneda: 'MXN', simbolo: '$', locale: 'es-MX' },
  { code: 'PE', nombre: 'Perú', moneda: 'PEN', simbolo: 'S/', locale: 'es-PE' },
  { code: 'CL', nombre: 'Chile', moneda: 'CLP', simbolo: '$', locale: 'es-CL' },
  { code: 'AR', nombre: 'Argentina', moneda: 'ARS', simbolo: '$', locale: 'es-AR' },
  { code: 'EC', nombre: 'Ecuador', moneda: 'USD', simbolo: '$', locale: 'es-EC' },
  { code: 'US', nombre: 'Estados Unidos', moneda: 'USD', simbolo: '$', locale: 'en-US' },
]

export const PAIS_INTERNACIONAL: Pais = {
  code: 'ALL', nombre: 'Internacional', moneda: 'USD', simbolo: '$', locale: 'es',
}

export function paisPorCodigo(code: string): Pais {
  return PAISES.find((p) => p.code === code) ?? PAIS_INTERNACIONAL
}

/**
 * Adivina el pais por la zona horaria del navegador. Es una CONJETURA para
 * preseleccionar el desplegable, no una decision: el visitante siempre puede
 * cambiarlo, y su eleccion se recuerda.
 */
export function adivinarPais(): string {
  if (typeof Intl === 'undefined') return 'ALL'
  const zonas: Record<string, string> = {
    'America/Caracas': 'VE',
    'America/Bogota': 'CO',
    'America/Mexico_City': 'MX',
    'America/Lima': 'PE',
    'America/Santiago': 'CL',
    'America/Argentina/Buenos_Aires': 'AR',
    'America/Guayaquil': 'EC',
  }
  try {
    return zonas[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? 'ALL'
  } catch {
    return 'ALL'
  }
}

/**
 * Redondeo "limpio" hacia arriba, como el del bot: 17.793 -> 17.800.
 * Un precio local con seis decimales se lee como un error, no como un precio.
 */
export function redondearLimpio(valor: number): number {
  if (valor <= 0) return 0
  const magnitud = Math.pow(10, Math.floor(Math.log10(valor)) - 2)
  return Math.ceil(valor / magnitud) * magnitud
}

export function formatearLocal(
  usd: number,
  pais: Pais,
  tasa: number | null,
  /**
   * Precio ya cerrado en la moneda del país, si el producto lo tiene fijado.
   *
   * Manda sobre la conversión: en algunos mercados el precio que aguanta la
   * competencia no es el que sale de multiplicar por la tasa, y ademas asi el
   * importe no baila cada vez que se mueve el tipo de cambio.
   */
  precioFijo?: number | null
): string {
  if (pais.moneda === 'USD' || (!tasa && precioFijo == null)) {
    return `$${usd.toFixed(2)}`
  }
  const local = precioFijo != null ? precioFijo : redondearLimpio(usd * (tasa as number))
  // Decimales consistentes: sin esto salian 'S/ 15.6' y 'S/ 146' en la misma
  // grilla, que en dinero se lee como un error. Por debajo de mil se muestran
  // los dos decimales; por encima estorban (Bs 16.556,00 no le sirve a nadie).
  const decimales = local >= 1000 ? 0 : 2
  return `${pais.simbolo} ${local.toLocaleString(pais.locale, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })}`
}

/**
 * Bandera del país a partir de su código ISO.
 *
 * Los emoji de bandera son dos "indicadores regionales": las letras del código
 * desplazadas a un bloque propio de Unicode. Derivarla evita mantener una
 * lista paralela de emoji que se olvidaría de actualizar al añadir un país.
 *
 * Para el código internacional -que no es un país- se usa un globo.
 */
export function banderaDe(code: string): string {
  const c = (code || '').toUpperCase()
  if (!/^[A-Z]{2}$/.test(c)) return '🌎'
  return String.fromCodePoint(...c.split('').map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))
}
