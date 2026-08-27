import { supabaseBrowser } from './supabase/client'
import {
  demoMembers,
  demoTournaments,
  demoProducts,
  demoNews,
} from './demo-data'
import type { Member, Tournament, Product, News, PaymentMethod, Setting, Profile, PointEvent } from './types'

function client() {
  try {
    return supabaseBrowser()
  } catch {
    return null
  }
}

export async function getMembers(): Promise<Member[]> {
  const sb = client()
  if (!sb) return demoMembers
  const { data, error } = await sb
    .from('members')
    .select('*')
    .eq('is_active', true)
    // nullsFirst:false es decisivo. En PostgreSQL, ORDER BY ... DESC pone los
    // NULL PRIMERO: la pagina de miembros abria con un muro de tarjetas vacias
    // (los que el bot aun no ha leido) y enterraba abajo a los jugadores con
    // estadisticas reales.
    .order('kd_ratio', { ascending: false, nullsFirst: false })
  if (error) return []
  if (!data || data.length === 0) return []
  return data as Member[]
}

export async function getTournaments(): Promise<Tournament[]> {
  const sb = client()
  if (!sb) return demoTournaments
  const { data, error } = await sb
    .from('tournaments')
    .select('*')
    .order('date_played', { ascending: false })
  if (error) return []
  if (!data || data.length === 0) return []
  return data as Tournament[]
}

export async function getProducts(): Promise<Product[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('category')
  // Ante un fallo se devuelve vacio y la tienda dice "no disponible". Caer a
  // datos de demostracion mostraba PRECIOS FALSOS como si fueran reales, que
  // es peor que no mostrar nada: el cliente escribe por WhatsApp con una cifra
  // que no existe.
  if (error || !data) return []
  return data as Product[]
}

/**
 * Momento de la ultima sincronizacion del bot, para poder decir en pantalla
 * hace cuanto que el dato es real en vez de un puntito que dice LIVE sin
 * consultar nada.
 */
export async function getUltimaSync(): Promise<Date | null> {
  const sb = client()
  if (!sb) return null
  const { data, error } = await sb
    .from('members')
    .select('last_sync')
    .order('last_sync', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data?.last_sync) return null
  return new Date(data.last_sync as string)
}

/**
 * Tasas USDT -> moneda local, puestas por el sync del bot.
 *
 * NO se piden a Binance desde el navegador ni desde una Cloudflare Function:
 * Binance bloquea las IPs del borde y devolvia vacio para las seis monedas.
 * La maquina que corre el bot si las alcanza, asi que las deja aqui cada
 * minuto y la tienda las lee de la base como cualquier otro dato.
 */
export async function getRates(): Promise<Record<string, number>> {
  const sb = client()
  if (!sb) return {}
  const { data, error } = await sb
    .from('settings')
    .select('value')
    .eq('key', 'rates_json')
    .maybeSingle()
  if (error || !data?.value) return {}
  try {
    return JSON.parse(data.value as string) as Record<string, number>
  } catch {
    return {}
  }
}

export async function getNews(): Promise<News[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
  if (error || !data) return []
  return data as News[]
}

export async function getNewsBySlug(slug: string): Promise<News | null> {
  const sb = client()
  if (!sb) return demoNews.find((n) => n.slug === slug) ?? null
  const { data, error } = await sb
    .from('news')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) return demoNews.find((n) => n.slug === slug) ?? null
  return data as News
}

export function subscribeToTable(table: string, onChange: () => void): () => void {
  const sb = client()
  if (!sb) return () => {}
  const channel = sb
    .channel(`${table}-changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange())
    .subscribe()
  return () => {
    sb.removeChannel(channel)
  }
}

// ---- Store: crear pedido y registrar actividad (usa anon key + policies) ----
export interface NewOrder {
  order_number: string
  customer_name: string
  free_fire_id?: string | null
  customer_discord?: string | null
  customer_email?: string | null
  product_id?: string | null
  quantity?: number
  total_usd: number
  status?: string
  payment_method?: string | null
  notes?: string | null
}

export async function createOrder(order: NewOrder): Promise<{ error: string | null }> {
  const sb = client()
  if (!sb) return { error: 'Sin conexión a la base de datos' }
  const { error } = await sb.from('orders').insert({
    ...order,
    status: order.status ?? 'pending',
    quantity: order.quantity ?? 1,
  })
  return { error: error?.message ?? null }
}

export async function logActivity(
  action: string,
  meta?: Record<string, unknown>
): Promise<void> {
  const sb = client()
  if (!sb) return
  try {
    await sb.from('activity_logs').insert({
      action,
      entity_type: 'store',
      metadata: meta ?? {},
    })
  } catch {
    // Silencioso: si no hay politica aun, no debe romper la UI
  }
}

export async function getActivityLogs(limit = 50): Promise<any[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data
}

// Notifica una venta/actividad a Discord via Cloud Function (webhook oculto)
export async function notifyDiscord(payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // silencioso
  }
}

// ---- Metodos de pago (administrables) ----
export async function getPaymentMethods(country?: string): Promise<PaymentMethod[]> {
  const sb = client()
  if (!sb) return []
  let q = sb.from('payment_methods').select('*').eq('enabled', true).order('position')
  if (country) q = q.or(`country.eq.ALL,country.eq.${country}`)
  const { data, error } = await q
  if (error || !data) return []
  return data as PaymentMethod[]
}

export async function getAllPaymentMethods(): Promise<PaymentMethod[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb.from('payment_methods').select('*').order('position')
  if (error || !data) return []
  return data as PaymentMethod[]
}

export async function createPaymentMethod(input: Partial<PaymentMethod>): Promise<{ error: string | null }> {
  const sb = client()
  if (!sb) return { error: 'Sin conexión' }
  const { error } = await sb.from('payment_methods').insert(input)
  return { error: error?.message ?? null }
}

export async function updatePaymentMethod(id: string, input: Partial<PaymentMethod>): Promise<{ error: string | null }> {
  const sb = client()
  if (!sb) return { error: 'Sin conexión' }
  const { error } = await sb.from('payment_methods').update(input).eq('id', id)
  return { error: error?.message ?? null }
}

export async function deletePaymentMethod(id: string): Promise<{ error: string | null }> {
  const sb = client()
  if (!sb) return { error: 'Sin conexión' }
  const { error } = await sb.from('payment_methods').delete().eq('id', id)
  return { error: error?.message ?? null }
}

// ---- Ajustes generales (WhatsApp, etc.) ----
export async function getSetting(key: string): Promise<string | null> {
  const sb = client()
  if (!sb) return null
  const { data, error } = await sb.from('settings').select('value').eq('key', key).maybeSingle()
  if (error || !data) return null
  return data.value as string | null
}

export async function setSetting(key: string, value: string): Promise<{ error: string | null }> {
  const sb = client()
  if (!sb) return { error: 'Sin conexión' }
  const { error } = await sb.from('settings').upsert({ key, value, updated_at: new Date().toISOString() })
  return { error: error?.message ?? null }
}

// ---- Perfil de miembro + puntos virtuales (Elite Coin) ----
export async function getMyProfile(): Promise<Profile | null> {
  const sb = client()
  if (!sb) return null
  const { data: u } = await sb.auth.getUser()
  const uid = u.user?.id
  if (!uid) return null
  const { data, error } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle()
  if (error || !data) return null
  return data as Profile
}

// Otorga puntos de check-in (10/dia) via RPC seguro. Devuelve saldo nuevo o null.
export async function dailyCheckin(): Promise<number | null> {
  const sb = client()
  if (!sb) return null
  const { data: u } = await sb.auth.getUser()
  const uid = u.user?.id
  if (!uid) return null
  const { data, error } = await sb.rpc('award_points', { p_profile_id: uid, p_type: 'checkin' })
  if (error) return null
  return data as number
}

// Vincula la cuenta a un miembro del clan por Free Fire ID (RPC seguro).
export async function linkMember(ffid: string): Promise<boolean> {
  const sb = client()
  if (!sb) return false
  const { data, error } = await sb.rpc('link_member', { p_ffid: ffid })
  if (error) return false
  return !!data
}

export async function getPointEvents(): Promise<PointEvent[]> {
  const sb = client()
  if (!sb) return []
  const { data: u } = await sb.auth.getUser()
  const uid = u.user?.id
  if (!uid) return []
  const { data, error } = await sb
    .from('point_events')
    .select('*')
    .eq('profile_id', uid)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as PointEvent[]
}

export async function getLeaderboard(limit = 50): Promise<Profile[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('profiles')
    .select('id, display_name, points, member_id, avatar_url')
    .order('points', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data as Profile[]
}

// ---- Retos / Objetivos (Fase 2) ----
export interface Challenge {
  id: string
  title: string
  description: string | null
  metric: string
  target: number
  points: number
  active: boolean
  created_at: string
}

export async function getChallenges(): Promise<Challenge[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('challenges')
    .select('*')
    .eq('active', true)
    .order('points', { ascending: false })
  if (error || !data) return []
  return data as Challenge[]
}

// Evalua los retos del usuario contra sus stats y otorga puntos por los nuevos cumplidos.
export async function checkChallenges(): Promise<number | null> {
  const sb = client()
  if (!sb) return null
  const { data: u } = await sb.auth.getUser()
  const uid = u.user?.id
  if (!uid) return null
  const { data, error } = await sb.rpc('check_challenges', { p_profile_id: uid })
  if (error) return null
  return data as number
}

export async function getMyChallengeCompletions(): Promise<Set<string>> {
  const sb = client()
  const set = new Set<string>()
  if (!sb) return set
  const { data: u } = await sb.auth.getUser()
  const uid = u.user?.id
  if (!uid) return set
  const { data, error } = await sb
    .from('challenge_completions')
    .select('challenge_id')
    .eq('profile_id', uid)
  if (error || !data) return set
  data.forEach((r: { challenge_id: string }) => set.add(r.challenge_id))
  return set
}

// ---- Competencia en vivo (participantes y su avance) ----
export interface Competidor {
  member_id: string
  nickname: string
  avance: number
  rank: string | null
  avatar_url: string | null
}

/**
 * Los que ESTAN compitiendo y cuanto llevan sumado, no el clan entero.
 *
 * `tournament_participants.kills` guarda el AVANCE desde que abrio la
 * competencia (actual - base), que lo calcula el sync del bot. La pagina
 * mostraba los 49 miembros del clan, que no es lo que pasa en la carrera.
 */
export async function getCompetidores(): Promise<Competidor[]> {
  const sb = client()
  if (!sb) return []
  // El torneo mas reciente es la competencia viva.
  const { data: torneo } = await sb
    .from('tournaments')
    .select('id')
    .order('date_played', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!torneo?.id) return []

  const { data, error } = await sb
    .from('tournament_participants')
    .select('member_id, kills, members(nickname, rank, avatar_url)')
    .eq('tournament_id', torneo.id)
    .order('kills', { ascending: false })
  if (error || !data) return []

  return (data as any[])
    .filter((r) => r.members)
    .map((r) => ({
      member_id: r.member_id,
      nickname: r.members.nickname,
      avance: r.kills ?? 0,
      rank: r.members.rank ?? null,
      avatar_url: r.members.avatar_url ?? null,
    }))
}

// ---- Metodos de pago CON sus datos (cuenta, cedula, telefono) ----
export interface MetodoPago {
  id: string
  nombre: string
  datos: string
  moneda: string
  paises: string[]
}

/**
 * Los datos con los que el cliente paga, publicados por el sync desde la
 * configuracion del bot de ventas.
 *
 * La tabla `payment_methods` solo tenia nombre y emoji, asi que la tienda
 * podia registrar el pedido pero no decir DONDE pagar: el cliente terminaba
 * y se iba a WhatsApp a preguntar. Esto es lo que cierra la venta.
 */
export async function getMetodosPago(): Promise<MetodoPago[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('settings')
    .select('value')
    .eq('key', 'pagos_json')
    .maybeSingle()
  if (error || !data?.value) return []
  try {
    return JSON.parse(data.value as string) as MetodoPago[]
  } catch {
    return []
  }
}
