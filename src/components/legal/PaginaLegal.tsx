import type { ReactNode } from 'react'

/**
 * Envoltorio de las páginas legales.
 *
 * Las tres (privacidad, términos, cookies) son texto largo y nada más, así que
 * comparten armazón: ancho de lectura corto, jerarquía clara y la fecha de
 * última actualización visible. Son componentes de servidor —no llevan
 * `'use client'`— porque no hay nada interactivo que justifique mandar
 * JavaScript al navegador para leer un texto.
 */

/** Ancho de línea de ~70 caracteres: más largo cansa, más corto salta mucho. */
export function PaginaLegal({
  titulo,
  entradilla,
  actualizado,
  children,
}: {
  titulo: string
  entradilla: string
  actualizado: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen pt-28 pb-24">
      <div className="section-container max-w-3xl">
        <header className="mb-10">
          <h1 className="font-display font-bold text-4xl gradient-text mb-3">{titulo}</h1>
          <p className="text-white/60">{entradilla}</p>
          <p className="text-white/30 text-sm mt-4 font-mono">
            Última actualización: {actualizado}
          </p>
        </header>

        {/* Los estilos van aquí y no en cada página: así las tres se ven igual
            y cambiar la tipografía del texto legal es un solo sitio. */}
        <article
          className="
            space-y-6 text-white/70 leading-relaxed
            [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-xl [&_h2]:text-white
            [&_h2]:mt-10 [&_h2]:mb-3
            [&_h3]:font-display [&_h3]:font-semibold [&_h3]:text-base [&_h3]:text-white/90
            [&_h3]:mt-6 [&_h3]:mb-2
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2
            [&_li]:marker:text-elite-primary/60
            [&_a]:text-elite-primary [&_a:hover]:underline
            [&_strong]:text-white [&_strong]:font-semibold
            [&_code]:font-mono [&_code]:text-sm [&_code]:text-elite-gold
          "
        >
          {children}
        </article>
      </div>
    </div>
  )
}

/** Aviso destacado, para lo que no debe pasarse por alto. */
export function Nota({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-elite-primary/25 bg-elite-primary/[0.05] p-5 text-sm">
      {children}
    </div>
  )
}
