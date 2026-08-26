'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { LogOut, Lock } from 'lucide-react'

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, role, loading, signIn, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center text-white/60 font-display">
        Cargando...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="card-glow p-10 text-center max-w-sm">
          <Lock className="w-14 h-14 text-elite-primary mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl gradient-text mb-2">Acceso Restringido</h1>
          <p className="text-white/60 text-sm mb-6">Iniciá sesión con Discord para continuar.</p>
          <button onClick={signIn} className="btn-primary w-full justify-center">Entrar con Discord</button>
        </div>
      </div>
    )
  }

  const allowed = role === 'owner' || role === 'admin' || role === 'moderator' || role === 'editor'
  if (!allowed) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="card-glow p-10 text-center max-w-sm">
          <Lock className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl mb-2">Sin permisos</h1>
          <p className="text-white/60 text-sm mb-6">Tu cuenta no tiene rol de staff.</p>
          <button onClick={signOut} className="btn-secondary w-full justify-center">Cerrar sesión</button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function AdminHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { signOut } = useAuth()
  return (
    <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
      <div>
        <Link href="/admin" className="text-elite-primary text-sm hover:underline">← Panel</Link>
        <h1 className="font-display font-bold text-3xl gradient-text mt-1">{title}</h1>
        {subtitle && <p className="text-white/50 text-sm">{subtitle}</p>}
      </div>
      <button onClick={signOut} className="btn-secondary inline-flex items-center gap-2">
        <LogOut className="w-4 h-4" /> Salir
      </button>
    </div>
  )
}
