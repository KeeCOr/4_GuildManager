import type { Mercenary } from '../types'
import { getSprite } from '../assets/Character/sprites'

const GRADE_RING: Record<string, { stroke: string; width: number; glow: string }> = {
  S: { stroke: '#e879f9', width: 2.5, glow: 'rgba(232,121,249,0.55)' },
  A: { stroke: '#fbbf24', width: 2,   glow: 'rgba(251,191,36,0.45)' },
  B: { stroke: '#34d399', width: 1.5, glow: 'rgba(52,211,153,0.3)' },
  C: { stroke: '#38bdf8', width: 1.5, glow: 'rgba(56,189,248,0.2)' },
  D: { stroke: '#64748b', width: 1,   glow: 'transparent' },
}
const CLASS_BADGE: Record<string, string> = {
  전사: '⚔', 궁수: '🏹', 도적: '🗡', 마법사: '🪄', 성직자: '🕊',
}
const ELEM_BG: Record<string, [string, string]> = {
  불:   ['#4a1200', '#200800'],
  얼음: ['#082840', '#041018'],
  번개: ['#302400', '#181000'],
  자연: ['#082810', '#030c06'],
  암흑: ['#180828', '#0a0412'],
  빛:   ['#282010', '#101008'],
}

export function MercAvatar({ m, size = 56 }: { m: Mercenary; size?: number }) {
  const ring    = GRADE_RING[m.grade] ?? GRADE_RING['D']
  const bg      = ELEM_BG[m.element] ?? ['#1a1a2e', '#0d0d1a']
  const isGhost = m.status === '영혼'
  const uid     = m.id.replace(/[^a-zA-Z0-9]/g, '_')

  const sprite = getSprite(m.race, m.traits.gender, m.class)

  return (
    <svg viewBox="0 0 56 56" width={size} height={size}
      style={{ display: 'block', flexShrink: 0, opacity: isGhost ? 0.55 : 1, filter: isGhost ? 'grayscale(0.6) hue-rotate(180deg)' : 'none' }}>
      <defs>
        <radialGradient id={`bg${uid}`} cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor={bg[0]} />
          <stop offset="100%" stopColor={bg[1]} />
        </radialGradient>
        <clipPath id={`clip${uid}`}>
          <circle cx="28" cy="28" r="26" />
        </clipPath>
      </defs>

      {/* Outer glow for A/S */}
      {(m.grade === 'S' || m.grade === 'A') && (
        <circle cx="28" cy="28" r="27.5" fill="none" stroke={ring.glow} strokeWidth="5" opacity="0.7" />
      )}

      {/* Background */}
      <circle cx="28" cy="28" r="26" fill={`url(#bg${uid})`} />

      {/* Character sprite */}
      <g clipPath={`url(#clip${uid})`}>
        {sprite ? (
          <image
            href={sprite}
            x="2" y="0" width="52" height="56"
            preserveAspectRatio="xMidYMax meet"
          />
        ) : (
          /* Fallback placeholder if sprite missing */
          <text x="28" y="34" textAnchor="middle" fontSize="22" opacity="0.6">
            {CLASS_BADGE[m.class]}
          </text>
        )}
      </g>

      {/* Grade border */}
      <circle cx="28" cy="28" r="26" fill="none" stroke={ring.stroke} strokeWidth={ring.width} />

      {/* Class badge — bottom-right */}
      <circle cx="44" cy="44" r="8.5" fill="rgba(0,0,0,0.75)" stroke={ring.stroke} strokeWidth="1" />
      <text x="44" y="47.5" textAnchor="middle" fontSize="9.5">{CLASS_BADGE[m.class]}</text>

      {/* S-grade sparkles */}
      {m.grade === 'S' && ([
        [7, 7, 0], [49, 9, 45], [8, 49, -20],
      ] as [number, number, number][]).map(([x, y, rot], i) => (
        <g key={i} transform={`translate(${x},${y}) rotate(${rot})`} opacity="0.9">
          <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke={ring.stroke} strokeWidth="0.9" />
          <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke={ring.stroke} strokeWidth="0.9" />
          <line x1="-2.5" y1="-2.5" x2="2.5" y2="2.5" stroke={ring.stroke} strokeWidth="0.6" opacity="0.5" />
          <line x1="2.5" y1="-2.5" x2="-2.5" y2="2.5" stroke={ring.stroke} strokeWidth="0.6" opacity="0.5" />
        </g>
      ))}

      {/* Ghost overlay */}
      {isGhost && (
        <circle cx="28" cy="28" r="26" fill="rgba(140,100,255,0.15)" />
      )}
    </svg>
  )
}
