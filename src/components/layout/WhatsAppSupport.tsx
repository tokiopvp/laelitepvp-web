'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { getSetting } from '@/lib/data'

export default function WhatsAppSupport() {
  const [num, setNum] = useState<string | null>(null)
  useEffect(() => {
    getSetting('whatsapp_number').then((v) => setNum(v && v.trim() ? v.trim() : null))
  }, [])
  if (!num) return null
  return (
    <a
      href={`https://wa.me/${num.replace(/[^0-9]/g, '')}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-green-500 shadow-lg shadow-green-500/40 flex items-center justify-center hover:scale-105 transition-transform"
      aria-label="Soporte por WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white" />
    </a>
  )
}
