import type { Mercenary } from '../types'

const statOrder: Array<keyof Mercenary['stats']> = ['공격력', '함정해제', '생존율', '협조성']

const normalize = (value: number) => Math.max(0, Math.min(1, value / 100))

export function StatRadar({ mercenary }: { mercenary: Mercenary }) {
  const points = statOrder.map((key, index) => {
    const angle = (Math.PI * 2 * index) / statOrder.length - Math.PI / 2
    const radius = 40 * normalize(mercenary.stats[key])
    const x = 50 + radius * Math.cos(angle)
    const y = 50 + radius * Math.sin(angle)
    return `${x},${y}`
  })

  return (
    <div className="flex flex-col items-center gap-2 text-slate-100">
      <div className="relative h-40 w-40 rounded-full bg-slate-900/80 p-3 shadow-castle">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <polygon points="50,10 90,35 75,85 25,85 10,35" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeWidth="0.8" />
          <polygon points={points.join(' ')} fill="rgba(34,197,94,0.25)" stroke="#22c55e" strokeWidth="1.2" />
          {statOrder.map((_, index) => {
            const angle = (Math.PI * 2 * index) / statOrder.length - Math.PI / 2
            return (
              <line
                key={index}
                x1="50"
                y1="50"
                x2={50 + 42 * Math.cos(angle)}
                y2={50 + 42 * Math.sin(angle)}
                stroke="#64748b"
                strokeWidth="0.5"
              />
            )
          })}
        </svg>
      </div>
      <div className="grid w-full grid-cols-2 gap-1 text-xs text-slate-300">
        {statOrder.map((key) => (
          <div key={key} className="flex justify-between rounded-lg bg-slate-900/90 px-2 py-1">
            <span>{key}</span>
            <span>{mercenary.stats[key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
