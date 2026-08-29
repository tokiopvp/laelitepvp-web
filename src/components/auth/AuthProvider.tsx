'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase/client'

export type Role = 'owner' | 'admin' | 'moderator' | 'editor' | 'member'

interface AuthContextValue {
  user: User | null
  role: Role | null
  loading: boolean
  isAuthed: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
  isAuthed: false,
  signIn: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = supabaseBrowser()
    if (!sb) {
      setLoading(false)
      return
    }

    const fetchRole = async (uid: string) => {
      const { data } = await sb!.from('profiles').select('role').eq('id', uid).maybeSingle()
      setRole((data?.role as Role) ?? null)
    }

    const aplicarSesion = (session: { user: User } | null) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchRole(session.user.id)
      else setRole(null)
    }

    // Restauracion robusta: si hay sesion guardada la usamos; si no,
    // intentamos refrescar el token antes de dar la sesion por cerrada.
    const restaurar = async () => {
      const { data: sesionGuardada } = await sb!.auth.getSession()
      if (sesionGuardada.session) {
        aplicarSesion(sesionGuardada.session)
      } else {
        const { data: refrescada } = await sb!.auth.refreshSession()
        aplicarSesion(refrescada.session)
      }
      setLoading(false)
    }
    restaurar()

    const { data: sub } = sb.auth.onAuthStateChange((_event: string, session: Session | null) => {
      aplicarSesion(session)
    })

    // Keep-alive: refresca el token periodicamente para que la sesion
    // nunca expire por inactividad (persistente para todos).
    const keepAlive = setInterval(() => {
      sb!.auth.refreshSession()
    }, 25 * 60 * 1000)

    return () => {
      sub.subscription.unsubscribe()
      clearInterval(keepAlive)
    }
  }, [])

  const signIn = async () => {
    const sb = supabaseBrowser()
    if (!sb) return
    await sb.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const signOut = async () => {
    const sb = supabaseBrowser()
    if (!sb) return
    await sb.auth.signOut()
    setUser(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, role, loading, isAuthed: !!user, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
