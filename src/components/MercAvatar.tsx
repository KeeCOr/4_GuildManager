import type { Mercenary } from '../types'
import { getSprite } from '../assets/Character/sprites'
import frameImg from '../assets/UI/merc-avatar-frame.png'

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

  const sprite = getSprite(m.race, m.traits.gender, m.class)

  return (
    <div
      role="img"
      aria-label={`${m.class} ${m.grade}등급 용병 아바타`}
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        opacity: isGhost ? 0.55 : 1,
        filter: isGhost ? 'grayscale(0.6) hue-rotate(180deg)' : 'none',
        boxShadow: (m.grade === 'S' || m.grade === 'A') ? `0 0 ${size * 0.18}px ${ring.glow}` : 'none',
        borderRadius: '50%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '3.5%',
          borderRadius: '50%',
          overflow: 'hidden',
          background: `radial-gradient(circle at 50% 60%, ${bg[0]}, ${bg[1]})`,
        }}
      >
        {sprite ? (
          <img
            src={sprite}
            alt=""
            style={{
              position: 'absolute',
              left: '3.5%',
              top: '0%',
              width: '93%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center bottom',
            }}
          />
        ) : (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: size * 0.39,
              opacity: 0.6,
            }}
          >
            {CLASS_BADGE[m.class]}
          </span>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          boxShadow: `inset 0 0 0 ${ring.width}px ${ring.stroke}`,
        }}
      />

      <img
        src={frameImg}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          right: '-5%',
          bottom: '-5%',
          width: '30%',
          height: '30%',
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.75)',
          border: `1px solid ${ring.stroke}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: size * 0.17 }}>{CLASS_BADGE[m.class]}</span>
      </div>
    </div>
  )
}
