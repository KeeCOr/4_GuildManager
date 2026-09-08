import { useEffect, useRef } from 'react'
import type { Mercenary } from '../types'
import frameImg from '../assets/UI/stat-radar-frame.png'

const statOrder: Array<keyof Mercenary['stats']> = ['공격력', '함정해제', '생존율', '협조성']

const normalize = (value: number) => Math.max(0, Math.min(1, value / 100))

function axisPoint(cx: number, cy: number, radius: number, index: number) {
  const angle = (Math.PI * 2 * index) / statOrder.length - Math.PI / 2
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const
}

function drawRadar(canvas: HTMLCanvasElement, stats: Mercenary['stats']) {
  const size = Math.max(1, canvas.clientWidth || canvas.clientHeight || 1)
  const dpr = window.devicePixelRatio || 1

  canvas.width = Math.round(size * dpr)
  canvas.height = Math.round(size * dpr)

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size, size)

  const cx = size / 2
  const cy = size / 2
  const maxRadius = size * 0.4

  ctx.lineWidth = Math.max(1, size * 0.005)
  ctx.strokeStyle = '#64748b'
  statOrder.forEach((_, index) => {
    const [x, y] = axisPoint(cx, cy, maxRadius, index)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.stroke()
  })

  ctx.beginPath()
  statOrder.forEach((_, index) => {
    const [x, y] = axisPoint(cx, cy, maxRadius, index)
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fillStyle = 'rgba(56,189,248,0.18)'
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = Math.max(1, size * 0.008)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  statOrder.forEach((key, index) => {
    const radius = maxRadius * normalize(stats[key])
    const [x, y] = axisPoint(cx, cy, radius, index)
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fillStyle = 'rgba(34,197,94,0.25)'
  ctx.strokeStyle = '#22c55e'
  ctx.lineWidth = Math.max(1.2, size * 0.012)
  ctx.fill()
  ctx.stroke()
}

export function StatRadar({ mercenary }: { mercenary: Mercenary }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const render = () => drawRadar(canvas, mercenary.stats)
    render()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(render)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [mercenary.stats])

  const ariaLabel = `${mercenary.name} 능력치: ${statOrder
    .map((key) => `${key} ${mercenary.stats[key]}`)
    .join(', ')}`

  return (
    <div className="flex flex-col items-center gap-2 text-slate-100">
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative h-40 w-40 rounded-full bg-slate-900/80 p-3 shadow-castle"
      >
        <img
          src={frameImg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        <canvas ref={canvasRef} className="relative z-10 h-full w-full" />
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
