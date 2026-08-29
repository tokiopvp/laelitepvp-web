/**
 * Elite Coin: tareas, tienda de canjes y mercado.
 *
 * REGLA QUE ORDENA TODO ESTE ARCHIVO
 * ----------------------------------
 * El navegador solo LEE y PIDE. Nunca decide cuántas coins vale algo ni cambia
 * un saldo: todo eso son funciones `SECURITY DEFINER` en Postgres
 * (`claim_task`, `redeem_item`, `house_trade`). Si el precio o la recompensa se
 * calcularan aquí, cualquiera con la consola del navegador abierta se pondría
 * un millón de coins en dos líneas y la economía se acabaría el primer día.
 *
 * Lo de aquí, por tanto, es presentación y llamadas.
 */

import { supabaseBrowser } from './supabase/client'

function client() {
  try {
    return supabaseBrowser()
  } catch {
    return null
  }
}

// ------------------------------------------------------------
// Tipos
// ------------------------------------------------------------

export type Periodo = 'diaria' | 'semanal' | 'unica'
export type Rareza = 'basura' | 'normal' | 'epico' | 'legendario'

export interface Tarea {
  id: string
  titulo: string
  descripcion: string | null
  metrica: string
  objetivo: number
  coins: number
  periodo: Periodo
  publico: 'clan' | 'todos'
  nivel: number
  icono: string | null
  activa: boolean
  orden: number
}

export interface ItemTienda {
  id: string
  nombre: string
  descripcion: string | null
  precio_coins: number
  diamantes: number | null
  valor_usd: number | null
  imagen_url: string | null
  rareza: Rareza
  stock: number
  limite_dia: number
  solo_clan: boolean
  activo: boolean
  orden: number
}

export interface Vela {
  bucket: string
  open: number
  high: number
  low: number
  close: number
  volumen: number
}

export interface Operacion {
  id: number
  lado: 'compra' | 'venta'
  actor: string
  coins: number
  precio: number
  tamano: number
  created_at: string
}

export interface Casa {
  nombre: string
  avatar_url: string | null
  coins: number
}

export interface Progreso {
  task_id: string
  progreso: number
  objetivo: number
  cobrada: boolean
}

export interface FilaTop {
  id: string
  nombre: string
  coins: number
  avatar_url: string | null
  es_miembro: boolean
  es_casa: boolean
}

// ------------------------------------------------------------
// Lecturas
// ------------------------------------------------------------

export async function getTareas(): Promise<Tarea[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('tasks')
    .select('*')
    .eq('activa', true)
    .order('orden')
  if (error || !data) return []
  return data as Tarea[]
}

/**
 * Progreso del usuario en cada tarea, resuelto por el servidor.
 *
 * Una sola llamada para las veinte tareas, y con la MISMA lógica que usa
 * `claim_task` para pagar. Si la barra y el cobro se calcularan por separado
 * acabarían discrepando, y una barra al 100% que al pulsar dice "todavía no
 * llegas" destruye la confianza en toda la página.
 */
export async function getProgreso(): Promise<Map<string, Progreso>> {
  const sb = client()
  if (!sb) return new Map()
  const { data, error } = await sb.rpc('my_task_progress')
  if (error || !Array.isArray(data)) return new Map()
  return new Map(
    (data as any[]).map((p) => [
      p.task_id,
      {
        task_id: p.task_id,
        progreso: Number(p.progreso) || 0,
        objetivo: Number(p.objetivo) || 1,
        cobrada: !!p.cobrada,
      },
    ])
  )
}

export async function getTienda(): Promise<ItemTienda[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('shop_items')
    .select('*')
    .eq('activo', true)
    .order('orden')
  if (error || !data) return []
  return data as ItemTienda[]
}

export async function getCasa(): Promise<Casa | null> {
  const sb = client()
  if (!sb) return null
  const { data } = await sb
    .from('house_account')
    .select('nombre, avatar_url, coins')
    .eq('id', 1)
    .maybeSingle()
  return (data as Casa) ?? null
}

/**
 * El ranking, con la cuenta grande insertada en su sitio.
 *
 * Esa cuenta no está en `profiles` (no tiene login detrás), así que se mezcla
 * aquí y se reordena por saldo. Va primero porque tiene el saldo más alto, no
 * porque se le haya clavado el puesto 1: si alguien lo superase de verdad, la
 * lista lo reflejaría.
 *
 * Sale etiquetada como un miembro más de la comunidad, no como "la casa": que
 * el número uno y quien mueve el mercado sean la misma mano es justo lo que no
 * debe deducirse mirando la tabla.
 */
export async function getTop(limite = 50): Promise<FilaTop[]> {
  const sb = client()
  if (!sb) return []
  const [{ data: perfiles }, casa] = await Promise.all([
    sb
      .from('profiles')
      .select('id, display_name, username, points, avatar_url, is_member')
      .order('points', { ascending: false })
      .limit(limite),
    getCasa(),
  ])

  const filas: FilaTop[] = (perfiles ?? []).map((p: any) => ({
    id: p.id,
    nombre: p.display_name || p.username || 'Jugador',
    coins: p.points ?? 0,
    avatar_url: p.avatar_url ?? null,
    es_miembro: !!p.is_member,
    es_casa: false,
  }))

  if (casa) {
    filas.push({
      id: 'casa',
      nombre: casa.nombre,
      coins: casa.coins,
      avatar_url: casa.avatar_url,
      // Se presenta como comunidad, igual que cualquier otro: marcarla como
      // miembro del clan la señalaría, y la gracia es que no destaque por nada
      // salvo por su saldo.
      es_miembro: false,
      es_casa: true,
    })
  }
  return filas.sort((a, b) => b.coins - a.coins).slice(0, limite)
}

/**
 * Serie del gráfico para un marco de tiempo.
 *
 * `market_series` agrupa en el SERVIDOR a ~120 puntos. El marco "SEMANA" son
 * 10.080 velas de un minuto: mandarlas enteras al móvil de alguien con datos
 * para pintar 120 columnas es tirar megabytes. Así cada marco pesa lo mismo.
 *
 * Antes se llama a `market_tick()`, que cierra las velas pendientes desde la
 * última visita. Es idempotente, así que da igual que entren cien personas a
 * la vez: el mercado sigue vivo sin depender de ningún cron.
 */
export async function getVelas(minutos: number, puntos = 120): Promise<Vela[]> {
  const sb = client()
  if (!sb) return []
  try {
    await sb.rpc('market_tick')
  } catch {
    /* si el tick falla, se pinta lo que ya hubiera */
  }
  const { data, error } = await sb.rpc('market_series', {
    p_minutos: minutos,
    p_puntos: puntos,
  })
  if (error || !Array.isArray(data)) return []
  return (data as any[]).map(normalizarVela)
}

function normalizarVela(v: any): Vela {
  // Postgres devuelve `numeric` como texto para no perder precisión; sin este
  // paso las comparaciones del gráfico serían alfabéticas ("9" > "10").
  return {
    bucket: v.bucket,
    open: Number(v.open),
    high: Number(v.high),
    low: Number(v.low),
    close: Number(v.close),
    volumen: Number(v.volumen),
  }
}

export async function getOperaciones(limite = 30): Promise<Operacion[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('market_trades')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite)
  if (error || !data) return []
  return (data as any[]).map((t) => ({ ...t, precio: Number(t.precio), coins: Number(t.coins) }))
}

// ------------------------------------------------------------
// Acciones
// ------------------------------------------------------------

export interface Resultado {
  ok: boolean
  error?: string
  coins?: number
  total?: number
  vela?: number
  progreso?: number
  objetivo?: number
  faltan?: number
  item?: string
  restante?: number
}

export async function cobrarTarea(taskId: string): Promise<Resultado> {
  const sb = client()
  if (!sb) return { ok: false, error: 'Sin conexión' }
  const { data, error } = await sb.rpc('claim_task', { p_task_id: taskId })
  if (error) return { ok: false, error: error.message }
  return data as Resultado
}

export async function canjear(itemId: string, ffid?: string): Promise<Resultado> {
  const sb = client()
  if (!sb) return { ok: false, error: 'Sin conexión' }
  const { data, error } = await sb.rpc('redeem_item', {
    p_item_id: itemId,
    p_ffid: ffid ?? null,
  })
  if (error) return { ok: false, error: error.message }
  return data as Resultado
}

/** La palanca del owner: mover el mercado a mano. */
export async function operarCasa(lado: 'compra' | 'venta', coins: number): Promise<Resultado> {
  const sb = client()
  if (!sb) return { ok: false, error: 'Sin conexión' }
  const { data, error } = await sb.rpc('house_trade', { p_lado: lado, p_coins: coins })
  if (error) return { ok: false, error: error.message }
  return data as Resultado
}

// ------------------------------------------------------------
// Presentación
// ------------------------------------------------------------

/**
 * Coins con separador de miles: 1200000 → "1.200.000".
 *
 * Se abrevió a "1.2M" en su día por ahorrar ancho, pero un saldo abreviado
 * pierde justo lo que lo hace impresionante. El número entero es el que
 * impone en un ranking, y con `tabular-nums` las columnas siguen cuadrando.
 */
export function coinsCorto(n: number): string {
  return Math.round(n).toLocaleString('es-ES')
}

/** El precio es minúsculo por diseño: hacen falta muchos decimales. */
export function precioTexto(p: number): string {
  if (!p) return '—'
  return '$' + p.toFixed(p < 0.01 ? 6 : 4)
}

export const COLOR_RAREZA: Record<Rareza, { borde: string; texto: string; fondo: string; etiqueta: string }> = {
  basura:     { borde: 'border-white/15',      texto: 'text-white/50',    fondo: 'bg-white/[0.03]',    etiqueta: 'Común' },
  normal:     { borde: 'border-sky-400/30',    texto: 'text-sky-300',     fondo: 'bg-sky-400/[0.06]',  etiqueta: 'Raro' },
  epico:      { borde: 'border-fuchsia-400/35',texto: 'text-fuchsia-300', fondo: 'bg-fuchsia-500/[0.07]', etiqueta: 'Épico' },
  legendario: { borde: 'border-amber-400/45',  texto: 'text-amber-300',   fondo: 'bg-amber-400/[0.08]', etiqueta: 'Legendario' },
}
