import { createBrowserClient } from '@supabase/ssr'

// Desactiva el cache HTTP del navegador para todas las lecturas de Supabase.
// Sin esto, los polls (ej. cada 20s en /miembros) devuelven respuestas
// cacheadas y la UI parece "congelada" aunque los datos en BD estan frescos.
const noStoreFetch = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, cache: 'no-store' })

let cliente: ReturnType<typeof createBrowserClient> | null = null

export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  if (cliente) return cliente
  cliente = createBrowserClient(url, key, {
    global: { fetch: noStoreFetch },
  })
  return cliente
}
