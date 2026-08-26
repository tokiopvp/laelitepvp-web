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
    .order('kd_ratio', { ascending: false })
  if (error || !data || data.length === 0) return demoMembers
  return data as Member[]
}

export async function getTournaments(): Promise<Tournament[]> {
  const sb = client()
  if (!sb) return demoTournaments
  const { data, error } = await sb
    .from('tournaments')
    .select('*')
    .order('date_played', { ascending: false })
  if (error || !data || data.length === 0) return demoTournaments
  return data as Tournament[]
}

export async function getProducts(): Promise<Product[]> {
  const sb = client()
  if (!sb) return demoProducts
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('category')
  if (error || !data || data.length === 0) return demoProducts
  return data as Product[]
}

export async function getNews(): Promise<News[]> {
  const sb = client()
  if (!sb) return demoNews
  const { data, error } = await sb
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
  if (error || !data || data.length === 0) return demoNews
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
