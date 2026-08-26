'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const sb = supabaseBrowser()
    const code = params.get('code')
    if (!sb || !code) {
      router.replace('/')
      return
    }
    ;(async () => {
      const { error } = await sb.auth.exchangeCodeForSession(code)
      if (error) {
        router.replace('/')
        return
      }
      const { data: u } = await sb.auth.getUser()
      const uid = u.user?.id
      let role: string | null = null
      if (uid) {
        const { data } = await sb.from('profiles').select('role').eq('id', uid).maybeSingle()
        role = (data?.role as string) ?? null
      }
      router.replace(role && role !== 'member' ? '/admin' : '/mi')
    })()
  }, [params, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-white/60 font-display text-lg gradient-text">Autenticando con Discord...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <CallbackInner />
    </Suspense>
  )
}
