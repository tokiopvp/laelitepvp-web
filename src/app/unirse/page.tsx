'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, UserPlus, CheckCircle, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabaseBrowser } from '@/lib/supabase/client'

export default function UnirsePage() {
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
      experience: form.experience || null,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
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
          <h2 className="font-display font-bold text-2xl gradient-text mb-2">¡Solicitud Enviada!</h2>
          <p className="text-white/60 mb-6">Revisaremos tu perfil y te contactaremos por Discord.</p>
          <Button onClick={() => setSubmitted(false)} variant="secondary">Enviar otra</Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="section-container max-w-2xl">
        <motion.div initial={{ y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-primary/10 border border-elite-primary/30 mb-4">
            <UserPlus className="w-4 h-4 text-elite-primary" />
            <span className="text-sm font-medium text-elite-primary">ÚNETE AL CLAN</span>
          </div>
          <h1 className="font-display font-bold text-4xl gradient-text mb-2">Forma Parte de la Elite</h1>
          <p className="text-white/60">Completa el formulario. Buscamos talento Diamond+.</p>
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
            label="Discord (opcional)"
            placeholder="usuario#0000"
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
