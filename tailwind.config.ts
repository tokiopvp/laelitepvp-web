import type { Config } from 'tailwindcss'

/**
 * Identidad: negro profundo, blanco, y UN acento.
 *
 * POR QUE SE CAMBIO OTRA VEZ
 * --------------------------
 * La version anterior era cian neon puro (#06fffd) sobre negro. Ese cian a
 * maxima saturacion sobre negro vibra en el borde de las letras, obliga a
 * bajar el brillo del texto para que no compita, y hace que todo -botones,
 * bordes, cifras, iconos- pida atencion a la vez. El resultado se lee barato
 * aunque cada pieza este bien hecha.
 *
 * Lo que se ve caro es lo contrario: casi todo en escala de grises, con el
 * color reservado para lo poco que de verdad importa. Un sitio premium usa
 * SU acento tres veces por pantalla, no treinta.
 *
 * EL REPARTO (uno por trabajo; si se solapan vuelve el ruido)
 *   primary   azul frio   -> el acento: enlaces, foco, el dato vivo
 *   accent    violeta     -> SOLO el segundo tono de un degradado con primary
 *   ice       blanco      -> titulares y cifras grandes
 *   gold      oro         -> SOLO lo ganado (1er puesto, booyah, saldo)
 *   danger    rojo        -> SOLO errores y perdidas
 *
 * Los azules estan DESATURADOS a proposito (#5b9dff, no #00aaff): un azul
 * limpio sobre negro se lee como pantalla bien calibrada; uno saturado, como
 * banner. Y el negro es #07080a, no #000: el negro puro apaga las sombras y
 * deja los paneles flotando sin relieve.
 */
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        elite: {
          primary: '#5b9dff',    // azul frio - el acento
          secondary: '#a78bfa',  // violeta - segundo tono de los degradados
          accent: '#a78bfa',
          dark: '#07080a',       // casi negro; el negro puro mata las sombras
          card: '#0e1014',       // panel, un punto por encima del fondo
          border: '#1c2029',     // borde que se intuye, no que se ve
          ice: '#f4f7fb',        // blanco frio - titulares y cifras
          gold: '#f0b429',       // oro: SOLO lo ganado
          live: '#ffffff',       // blanco puro: SOLO "dato en vivo"
          ember: '#5b9dff',
          ash: '#07080a',
          muted: '#8b95a7',      // texto secundario, legible sin gritar
          danger: '#f0616d',
          success: '#4ade80',
        },
        // Gradientes neon para fondos
        neonGradient: 'linear-gradient(135deg, #5b9dff 0%, #a78bfa 100%)',
        // Fondo oscuro para cartas y paneles
        eliteDark: 'rgba(7, 8, 10, 0.8)',
        // Blanco con transparencia para textos sutiles
        whiteSubtle: 'rgba(255, 255, 255, 0.7)',
      },
      boxShadow: {
        neon: '0 0 24px rgba(91, 157, 255, 0.28)',
        neonStrong: '0 0 44px rgba(91, 157, 255, 0.45)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 48px -12px rgba(0,0,0,0.9)',
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Arial Narrow', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      // Cifras que se alinean en columna (K/D, precios, tops).
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.4s ease-out',
        'spark-rise': 'spark-rise 9s linear infinite',
        // Neon: el parpadeo de un tubo al encender. Corto y con pausa larga,
        // para que llame la atencion una vez y no maree.
        'neon-flicker': 'neon-flicker 6s ease-in-out infinite',
        // Barrido de escaner sobre una tarjeta (el "radar" de Free Fire).
        'scan': 'scan 3.5s ease-in-out infinite',
        // Luz que recorre un borde.
        'border-run': 'border-run 4s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 18px rgba(91, 157, 255, 0.18)' },
          '50%': { boxShadow: '0 0 40px rgba(91, 157, 255, 0.42)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'spark-rise': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '0' },
          '10%': { opacity: '0.8' },
          '100%': { transform: 'translateY(-70vh) scale(0.4)', opacity: '0' },
        },
        'neon-flicker': {
          '0%, 82%, 100%': { opacity: '1' },
          '84%': { opacity: '0.45' },
          '86%': { opacity: '1' },
          '88%': { opacity: '0.6' },
          '90%': { opacity: '1' },
        },
        'scan': {
          '0%': { transform: 'translateY(-120%)' },
          '55%, 100%': { transform: 'translateY(320%)' },
        },
        'border-run': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
    },
  },
  plugins: [],
}
export default config
