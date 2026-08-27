import type { Config } from 'tailwindcss'

/**
 * Identidad "negro, carmesi y cristal".
 *
 * Los NOMBRES de los tokens (elite-primary, elite-card...) se mantienen a
 * proposito: las ~20 paginas ya los usan, asi que cambiando aqui los VALORES
 * todo el sitio adopta la identidad nueva sin tocar una sola pagina.
 *
 * Tomada de la interfaz real del juego: fondo casi negro, emblemas y acentos
 * en carmesi, y paneles translucidos con desenfoque (el 'cristal'). El naranja
 * brasa anterior era una lectura mia; esta se parece a lo que el jugador ve
 * cuando abre Free Fire.
 *
 * El cian se queda con un unico trabajo honesto, `elite-live`, para marcar lo
 * que esta llegando en vivo desde los bots.
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
          primary: '#e11d3c',    // carmesi - el acento, uno por pantalla
          secondary: '#7a0b1b',  // sangre oscura - solo para degradados
          dark: '#08080a',       // negro carbon
          card: '#101014',       // panel base (el cristal se hace en CSS)
          border: '#20202a',
          gold: '#e8b33c',       // oro: SOLO para lo ganado (1er puesto, booyah)
          live: '#00d4ff',       // cian: SOLO para "dato en vivo"
          ember: '#e11d3c',
          ash: '#101014',
          danger: '#e5484d',
          success: '#46a758',
        },
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
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(225, 29, 60, 0.25)' },
          '50%': { boxShadow: '0 0 40px rgba(225, 29, 60, 0.5)' },
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
      },
    },
  },
  plugins: [],
}
export default config
