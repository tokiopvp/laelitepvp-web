import { Info } from 'lucide-react'

/**
 * Aviso previo: si el correo de Discord está sin verificar, el acceso falla.
 *
 * POR QUE VA ANTES Y NO SOLO DESPUES
 * ----------------------------------
 * El error existe y no lo podemos evitar desde aquí: si Discord no entrega el
 * correo, no hay usuario que crear. La pantalla de fallo ya lo explica, pero
 * para entonces la persona ya se llevó el chasco — y en un público joven, un
 * "no pudimos entrar" suele acabar en cerrar la pestaña, no en leer.
 *
 * Dicho de antemano, quien lo tenga sin verificar lo arregla en treinta
 * segundos y entra a la primera.
 *
 * POR QUE TAN DISCRETO
 * --------------------
 * Un cartel de advertencia grande delante del botón de entrar asusta y hace
 * dudar a los que no tienen ningún problema, que son la mayoría. Va en gris,
 * pequeño y en una línea: lo lee quien está buscando por qué le falló, y no
 * estorba al resto.
 *
 * Es un componente de servidor -sin `'use client'`- porque es texto puro: no
 * hay motivo para mandar JavaScript al navegador por esto.
 */
export default function AvisoCorreoDiscord({ className = '' }: { className?: string }) {
  return (
    <p
      // `flex` y no `inline-flex`: dentro de una cabecera centrada, el inline
      // se colocaba AL LADO del boton en pantallas anchas en vez de debajo.
      className={`flex items-start gap-1.5 text-left text-white/30 text-xs leading-snug ${className}`}
    >
      <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
      <span>
        Tu correo de Discord debe estar <strong className="text-white/50">verificado</strong>, o el
        acceso fallará. Se comprueba en Discord → Ajustes de usuario → Mi cuenta.
      </span>
    </p>
  )
}
