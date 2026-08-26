import { supabaseBrowser } from './supabase/client'
import {
  demoMembers,
  demoTournaments,
  demoProducts,
  demoNews,
} from './demo-data'
import type { Member, Tournament, Product, News } from './types'

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
