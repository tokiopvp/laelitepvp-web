/**
 * Carrito y pedidos pendientes que SOBREVIVEN a cerrar la pestaña.
 *
 * EL PROBLEMA
 * -----------
 * El carrito vivia solo en el estado de React. Recargar, tocar atras, o que el
 * movil descargara la pestaña por falta de memoria: se perdia todo y el cliente
 * tenia que empezar de cero. Casi nadie lo hace dos veces.
 *
 * Y peor: al confirmar, el pedido se crea en `pending` y el cliente se va a
 * pagar a otra app. Cuando volvia, la tienda no se acordaba de nada. Su
 * numero de referencia solo existia en una pantalla que ya habia cerrado, asi
 * que no tenia como mandar el comprobante ni saber en que iba su compra.
 *
 * QUE SE GUARDA Y QUE NO
 * ----------------------
 * En el navegador queda lo minimo para retomar: que productos, cuantos, y los
 * numeros de pedido. NADA sensible: ni metodo de pago con datos, ni correo, ni
 * comprobantes. El estado real de cada pedido se relee de la base cada vez, que
 * es la unica fuente que manda.
 *
 * Sobre los PRECIOS: se guarda el precio visto solo para poder dibujar el
 * carrito antes de que carguen los productos. Al reconstruirlo se sustituye por
 * el precio ACTUAL del catalogo. Los precios cambian a diario y cobrar uno
 * viejo porque estaba en el navegador del cliente seria un error caro.
 */
import type { Product } from '@/lib/types'

const CLAVE_CARRITO = 'elite_carrito_v1'
const CLAVE_PENDIENTES = 'elite_pendientes_v1'
const CLAVE_DATOS = 'elite_datos_cliente_v1'

/** Los pendientes caducan: un pedido de hace un mes ya no se esta pagando. */
const DIAS_VIGENCIA = 14

export interface LineaGuardada {
  id: string
  qty: number
  /** Solo para pintar mientras carga el catalogo. Nunca para cobrar. */
  nombre: string
  precio: number
}

export interface PedidoPendiente {
  referencia: string
  creado: number
  totalUSD: number
  totalLocal: string | null
  metodo: string
  detalle: string
  /** Se rellena al releer la base; null mientras no se sabe. */
  estado?: string | null
}

export interface DatosCliente {
  name: string
  ffid: string
  discord: string
}

function leer<T>(clave: string, porDefecto: T): T {
  if (typeof window === 'undefined') return porDefecto
  try {
    const crudo = localStorage.getItem(clave)
    return crudo ? (JSON.parse(crudo) as T) : porDefecto
  } catch {
    // Modo incognito, almacenamiento lleno o un JSON corrupto de una version
    // anterior. Ninguno de esos casos debe dejar la tienda en blanco.
    return porDefecto
  }
}

function escribir(clave: string, valor: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // Sin almacenamiento la tienda sigue funcionando: se pierde la comodidad,
    // no la venta.
  }
}

// ── Carrito ───────────────────────────────────────────────────────────────

export function guardarCarrito(lineas: LineaGuardada[]): void {
  if (lineas.length === 0) localStorage.removeItem(CLAVE_CARRITO)
  else escribir(CLAVE_CARRITO, lineas)
}

export function leerCarrito(): LineaGuardada[] {
  const l = leer<LineaGuardada[]>(CLAVE_CARRITO, [])
  return Array.isArray(l) ? l.filter((x) => x && typeof x.id === 'string' && x.qty > 0) : []
}

/**
 * Reconstruye el carrito contra el catalogo ACTUAL.
 *
 * Un producto puede haberse agotado o retirado desde la ultima visita: esas
 * lineas se descartan en silencio en vez de mostrar algo que no se puede
 * vender. Devuelve tambien cuantas se cayeron, para poder avisar.
 */
export function reconstruirCarrito(
  guardado: LineaGuardada[],
  catalogo: Product[]
): { carrito: Record<string, { product: Product; qty: number }>; descartadas: number } {
  const porId = new Map(catalogo.map((p) => [p.id, p]))
  const carrito: Record<string, { product: Product; qty: number }> = {}
  let descartadas = 0
  for (const l of guardado) {
    const p = porId.get(l.id)
    if (!p) { descartadas++; continue }
    carrito[p.id] = { product: p, qty: Math.max(1, Math.min(99, Math.floor(l.qty))) }
  }
  return { carrito, descartadas }
}

// ── Pedidos pendientes ────────────────────────────────────────────────────

export function leerPendientes(): PedidoPendiente[] {
  const l = leer<PedidoPendiente[]>(CLAVE_PENDIENTES, [])
  if (!Array.isArray(l)) return []
  const limite = Date.now() - DIAS_VIGENCIA * 86400_000
  return l.filter((p) => p && typeof p.referencia === 'string' && p.creado > limite)
}

export function agregarPendientes(nuevos: PedidoPendiente[]): void {
  const previos = leerPendientes()
  const vistos = new Set(previos.map((p) => p.referencia))
  escribir(CLAVE_PENDIENTES, [...nuevos.filter((n) => !vistos.has(n.referencia)), ...previos])
}

/** Se llama cuando el pedido ya se entrego o el cliente lo descarta. */
export function olvidarPendiente(referencia: string): void {
  escribir(CLAVE_PENDIENTES, leerPendientes().filter((p) => p.referencia !== referencia))
}

export function guardarEstados(estados: Record<string, string>): void {
  escribir(
    CLAVE_PENDIENTES,
    leerPendientes().map((p) => ({ ...p, estado: estados[p.referencia] ?? p.estado ?? null }))
  )
}

// ── Datos del cliente ─────────────────────────────────────────────────────

/**
 * El nombre y el ID de Free Fire se reescriben en CADA compra. Guardarlos le
 * ahorra al cliente habitual teclear su ID de 9 cifras desde el movil, que es
 * justo donde mas gente abandona.
 */
export function guardarDatos(d: DatosCliente): void {
  escribir(CLAVE_DATOS, d)
}

export function leerDatos(): DatosCliente | null {
  const d = leer<DatosCliente | null>(CLAVE_DATOS, null)
  return d && typeof d.ffid === 'string' ? d : null
}
