'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, UserPlus, CheckCircle, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabaseBrowser } from '@/lib/supabase/client'
import { notificar } from '@/lib/data'
import DosCaminos from '@/components/unirse/DosCaminos'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'

export default function UnirsePage() {
  const { isAuthed, signIn } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nickname: '',
    free_fire_id: '',
    rank: '',
    age: '',
    experience: '',
    discord: '',
    whatsapp: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const sb = supabaseBrowser()
    if (!sb) {
      setError('No se pudo conectar con la base de datos.')
      setLoading(false)
      return
    }
    const { error: err } = await sb.from('applications').insert({
      nickname: form.nickname,
      free_fire_id: form.free_fire_id,
      rank: form.rank || null,
      age: form.age ? parseInt(form.age, 10) : null,
      discord: form.discord || null,
      whatsapp: form.whatsapp || null,
      experience: form.experience || null,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }

    // Aviso al movil. Va DESPUES de guardar y sin await bloqueante: si el
    // aviso falla, la solicitud ya esta a salvo en la base de datos y no tiene
    // sentido decirle a nadie que no se envio.
    notificar({
      type: 'application',
      nickname: form.nickname,
      free_fire_id: form.free_fire_id,
      rank: form.rank || null,
      age: form.age || null,
      whatsapp: form.whatsapp || null,
      discord: form.discord || null,
      experience: form.experience || null,
    })

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <motion.div
          className="card-glow p-10 text-center max-w-md"
          initial={{ scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <CheckCircle className="w-16 h-16 text-elite-primary mx-auto mb-4" />
          <h2 className="font-display font-bold text-2xl gradient-text mb-2">¡Solicitud enviada!</h2>
          <p className="text-white/60 mb-6">
            La revisamos y te escribimos por <strong className="text-white/80">WhatsApp</strong>.
          </p>

          {/* Este es EL momento del malentendido: acaban de mandar la solicitud
              y creen que ya tienen cuenta. Aqui se les dice que no, y se les da
              el boton para tenerla de verdad — sin esperar a que nadie apruebe
              nada. Es lo que convierte una espera en alguien jugando hoy. */}
          <div className="rounded-xl border border-elite-gold/25 bg-elite-gold/[0.06] p-5 mb-6 text-left">
            <p className="font-display font-bold text-elite-gold mb-1">Mientras tanto…</p>
            <p className="text-white/60 text-sm leading-relaxed">
              Esto <strong className="text-white/80">todavía no es tu cuenta</strong>. Entra con
              Discord y empieza a ganar Elite Coin ya — no hace falta que te acepten en el clan.
            </p>
          </div>

          {isAuthed ? (
            <Link href="/comunidad" className="btn-primary w-full justify-center inline-flex">
              Ir a Comunidad
            </Link>
          ) : (
            <button
              onClick={signIn}
              className="w-full inline-flex items-center justify-center gap-3 rounded-xl px-5 py-3.5 min-h-[48px] font-display font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#5865F2,#4148c4)' }}
            >
              Entrar con Discord y empezar a ganar
            </button>
          )}

          <button
            onClick={() => setSubmitted(false)}
            className="mt-4 text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            Enviar otra solicitud
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="section-container max-w-2xl">
        <motion.div initial={{ y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="font-display font-bold text-4xl gradient-text mb-2">
            ¿Qué quieres hacer?
          </h1>
          <p className="text-white/60">Son dos cosas distintas, y puedes hacer las dos.</p>
        </motion.div>

        <DosCaminos />

        <motion.div id="solicitud" initial={{ y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 scroll-mt-28">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-primary/10 border border-elite-primary/30 mb-4">
            <UserPlus className="w-4 h-4 text-elite-primary" />
            <span className="text-sm font-medium text-elite-primary">SOLICITUD DE INGRESO AL CLAN</span>
          </div>
          <h2 className="font-display font-bold text-3xl mb-2">Forma parte del squad</h2>
          <p className="text-white/60 text-sm">
            Buscamos talento Diamond+. Te escribimos por WhatsApp en cuanto la revisemos.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="card-glow p-8 space-y-5"
          initial={{ y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Input
            label="Nickname en Free Fire"
            placeholder="Tu nombre en el juego"
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            required
          />
          <Input
            label="Free Fire ID"
            placeholder="Ej: 123456789"
            value={form.free_fire_id}
            onChange={(e) => setForm({ ...form, free_fire_id: e.target.value })}
            required
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <Input
              label="Rango actual"
              placeholder="Ej: Diamond"
              value={form.rank}
              onChange={(e) => setForm({ ...form, rank: e.target.value })}
            />
            <Input
              label="Edad"
              type="number"
              placeholder="18+"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
            />
          </div>
          <Input
            label="WhatsApp"
            type="tel"
            placeholder="+51 900 000 000"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            required
          />
          <p className="text-white/35 text-xs -mt-3">
            Con código de país. Es por donde te avisamos si entras.
          </p>
          <Input
            label="Discord (opcional)"
            placeholder="tu_usuario"
            value={form.discord}
            onChange={(e) => setForm({ ...form, discord: e.target.value })}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-white/80">Experiencia competitiva</label>
            <textarea
              className="w-full px-4 py-3 bg-elite-dark/50 border border-elite-border rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-elite-primary/50 min-h-[100px]"
              placeholder="Cuéntanos de tus torneos, equipos, logros..."
              value={form.experience}
              onChange={(e) => setForm({ ...form, experience: e.target.value })}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          <Button type="submit" className="w-full justify-center group" disabled={loading}>
            <Send className="w-4 h-4" />
            {loading ? 'Enviando...' : 'Enviar Solicitud'}
          </Button>
        </motion.form>
      </div>
    </div>
  )
}
