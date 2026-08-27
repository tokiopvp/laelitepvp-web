'use client'

import { useId } from 'react'

const RANK_COLORS: Record<string, string> = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700',
  Platinum: '#e5e4e2',
  Diamond: '#b9f2ff',
  Master: '#ff6b6b',
  Grandmaster: '#c77dff',
  Heroic: '#ff2e63',
}

const TIER: Record<string, number> = {
  Bronze: 1, Silver: 2, Gold: 3, Platinum: 4, Diamond: 5,
  Master: 6, Grandmaster: 7, Heroic: 8,
}

function starPoints(cx: number, cy: number, r: number, inner = r * 0.45, n = 5): string {
  const p: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? r : inner
    const a = (Math.PI / n) * i - Math.PI / 2
    p.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`)
  }
  return p.join(' ')
}

export function RankEmblem({ rank, size = 40 }: { rank: string; size?: number }) {
  const id = useId().replace(/:/g, '')
  const color = RANK_COLORS[rank] || '#888'
  const tier = TIER[rank] || 1
  const isCrown = tier >= 6
  const pips = isCrown ? tier - 5 : tier

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={tier === 8 ? 'animate-pulse-glow' : ''}
      style={{ filter: `drop-shadow(0 0 ${Math.max(2, size / 12)}px ${color})` }}
    >
      <defs>
        <radialGradient id={`rg-${id}`} cx="50%" cy="36%" r="68%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="38%" stopColor={color} />
          <stop offset="100%" stopColor="#05050a" />
        </radialGradient>
      </defs>

      <circle cx="32" cy="32" r="29" fill={`url(#rg-${id})`} stroke={color} strokeWidth="2.5" />
      <circle cx="32" cy="32" r="23" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.5" />

      {isCrown ? (
        <g fill="#ffffff">
          <rect x="15" y="32" width="34" height="5" rx="1.5" />
          <path d="M18 33 L23 19 L29 27 L32 16 L35 27 L41 19 L46 33 Z" />
        </g>
      ) : (
        <polygon points={starPoints(32, 29, 13)} fill="#ffffff" />
      )}

      <g fill="#ffffff">
        {Array.from({ length: pips }).map((_, i) => {
          const x = 32 + (i - (pips - 1) / 2) * 9
          return <polygon key={i} points={starPoints(x, 51, 3)} />
        })}
      </g>
    </svg>
  )
}
