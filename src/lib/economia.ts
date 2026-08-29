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

/** Qué tareas ya cobró el usuario en el periodo vigente. */
export async function getTareasCobradas(): Promise<Set<string>> {
  const sb = client()
  if (!sb) return new Set()
  const { data: u } = await sb.auth.getUser()
  if (!u.user) return new Set()
  const { data } = await sb
    .from('task_completions')
    .select('task_id, periodo_key')
    .eq('profile_id', u.user.id)
  if (!data) return new Set()

  // Las claves de periodo se recalculan igual que en SQL: una tarea diaria
  // cobrada ayer tiene que volver a aparecer disponible hoy, no quedarse gris.
  const hoy = clavePeriodo('diaria')
  const semana = clavePeriodo('semanal')
  const vigentes = new Set([hoy, semana, 'unica'])
  return new Set(
    (data as { task_id: string; periodo_key: string }[])
      .filter((r) => vigentes.has(r.periodo_key))
      .map((r) => r.task_id)
  )
}

/** Misma fórmula que `claim_task` en Postgres. Si una cambia, cambian las dos. */
export function clavePeriodo(periodo: Periodo, d = new Date()): string {
  if (periodo === 'unica') return 'unica'
  if (periodo === 'diaria') return d.toISOString().slice(0, 10)
  // ISO 8601: la semana del jueves de esa semana, igual que `IYYY-"W"IW`.
  const j = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  j.setUTCDate(j.getUTCDate() + 4 - (j.getUTCDay() || 7))
  const inicio = new Date(Date.UTC(j.getUTCFullYear(), 0, 1))
  const semana = Math.ceil(((j.getTime() - inicio.getTime()) / 86400000 + 1) / 7)
  return `${j.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`
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
 * El ranking, con la cuenta de la casa insertada en su sitio.
 *
 * Barron Trump no está en `profiles` (no tiene cuenta de verdad), así que se
 * mezcla aquí y se reordena por saldo. Va primero porque tiene millones, no
 * porque se le haya clavado el puesto 1 a mano: si alguien lo superase de
 * verdad, la lista lo reflejaría.
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
      es_miembro: true,
      es_casa: true,
    })
  }
  return filas.sort((a, b) => b.coins - a.coins).slice(0, limite)
}

/**
 * Velas del gráfico.
 *
 * Antes de leer se llama a `market_tick()`, que cierra las velas que quedaron
 * pendientes desde la última visita. Es idempotente: si la vela del intervalo
 * actual ya existe no hace nada, así que da igual que entren cien personas a la
 * vez. Gracias a eso el mercado sigue vivo sin depender de ningún cron.
 */
export async function getVelas(limite = 180): Promise<Vela[]> {
  const sb = client()
  if (!sb) return []
  try {
    await sb.rpc('market_tick')
  } catch {
    /* si el tick falla, se pintan las velas que ya hubiera */
  }
  const { data, error } = await sb
    .from('market_candles')
    .select('bucket, open, high, low, close, volumen')
    .order('bucket', { ascending: false })
    .limit(limite)
  if (error || !data) return []
  // Se piden las más nuevas y se les da la vuelta: pedirlas ascendentes traería
  // las más ANTIGUAS y el gráfico mostraría historia muerta.
  return (data as any[]).map(normalizarVela).reverse()
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

/** 1.234.567 → "1.23M". En una tabla de tops, doce dígitos no se leen. */
export function coinsCorto(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (n >= 10_000) return Math.round(n / 1000) + 'K'
  return n.toLocaleString('es')
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
