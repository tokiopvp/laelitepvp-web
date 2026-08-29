'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { getSetting } from '@/lib/data'
import { WHATSAPP, enlaceWhatsApp } from '@/lib/contacto'

export default function WhatsAppSupport() {
  // Arranca con el numero del clan y solo lo cambia si el panel guardo otro.
  // Antes empezaba vacio y no dibujaba nada hasta que Supabase respondia; si el
  // ajuste no existia, el boton de soporte no aparecia NUNCA. Un cliente con
  // una duda a punto de pagar no tenia por donde escribir.
  const [num, setNum] = useState<string>(WHATSAPP)
  useEffect(() => {
    getSetting('whatsapp_number').then((v) => { if (v && v.trim()) setNum(v.trim()) })
  }, [])
  return (
    <a
      href={enlaceWhatsApp('Hola, necesito ayuda con una compra.', num)}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-green-500 shadow-lg shadow-green-500/40 flex items-center justify-center hover:scale-105 transition-transform"
      aria-label="Soporte por WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white" />
    </a>
  )
}
