export function CondBar({ cond }: { cond: number }) {
  const col = cond >= 70 ? '#22c55e' : cond >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${cond}%`, background: col }} />
    </div>
  )
}
