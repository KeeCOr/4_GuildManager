import { useEffect, useState } from 'react'
import type { ActiveExpedition, Mercenary } from '../types'
import { effPower } from '../utils/power'

const GRADE_STARS: Record<string, string> = { S: '★★★★★', A: '★★★★', B: '★★★', C: '★★', D: '★' }
const GRADE_COLOR: Record<string, string> = {
  S: '#e879f9', A: '#fbbf24', B: '#34d399', C: '#38bdf8', D: '#94a3b8'
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return '완료'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`
}

interface Props {
  expedition: ActiveExpedition
  mercs: Mercenary[]
  onClose: () => void
  onClaim: () => void
}

export function ExpeditionPanel({ expedition, mercs, onClose, onClaim }: Props) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const assigned = expedition.assignedMercIds.map(id => mercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
  const partyPower = assigned.reduce((s, m) => s + effPower(m), 0)
  const remaining = expedition.completesAt - now
  const done = remaining <= 0
  const result = expedition.result

  // rank bar data
  const allScores = [...expedition.npcScores, partyPower].sort((a, b) => b - a)
  const playerRank = result ? result.rank : allScores.indexOf(partyPower) + 1
  const maxScore = allScores[0]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="gm-modal-frame rounded-2xl overflow-hidden w-[480px] max-h-[90vh] overflow-y-auto"
        style={{ background: '#0c0b1a', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 0 40px rgba(139,92,246,0.15)' }}>
        {/* Header */}
        <div className="gm-panel-header px-6 py-4" style={{ background: 'linear-gradient(135deg, rgba(88,28,135,0.4), rgba(30,27,75,0.8))' }}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">⚔ 정기 원정</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(160,140,200,0.7)' }}>타 길드와 전력 경쟁 — 사망 위험 없음</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Timer / Status */}
          <div className="rounded-xl px-4 py-3 text-center"
            style={{ background: done ? 'rgba(34,197,94,0.1)' : 'rgba(88,28,135,0.15)', border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : 'rgba(139,92,246,0.25)'}` }}>
            {done ? (
              <p className="text-emerald-400 font-bold text-lg">✅ 원정 완료!</p>
            ) : (
              <>
                <p className="text-xs" style={{ color: 'rgba(160,140,200,0.6)' }}>귀환까지</p>
                <p className="text-2xl font-bold text-white mt-1">{fmtCountdown(remaining)}</p>
              </>
            )}
          </div>

          {/* Party */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: 'rgba(180,160,220,0.7)' }}>파견 용병</p>
            <div className="space-y-1.5">
              {assigned.map(m => (
                <div key={m.id} className="gm-slot-frame flex justify-between items-center px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: GRADE_COLOR[m.grade] }}>{m.grade}</span>
                    <span className="text-sm text-white">{m.name}</span>
                    <span className="text-xs" style={{ color: 'rgba(130,130,150,0.6)' }}>{m.class}</span>
                  </div>
                  <span className="text-xs font-bold text-cyan-300">전력 {effPower(m)}</span>
                </div>
              ))}
            </div>
            <p className="text-right text-xs mt-1.5 font-bold text-cyan-300">총 전력: {partyPower}</p>
          </div>

          {/* Rankings */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: 'rgba(180,160,220,0.7)' }}>경쟁 현황</p>
            <div className="space-y-1.5">
              {allScores.map((score, i) => {
                const isPlayer = score === partyPower && i === allScores.indexOf(partyPower)
                const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
                return (
                  <div key={i} className="relative rounded-lg overflow-hidden"
                    style={{ background: isPlayer ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isPlayer ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.06)'}` }}>
                    <div className="absolute inset-y-0 left-0 rounded-lg" style={{ width: `${pct}%`, background: isPlayer ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)' }} />
                    <div className="relative flex justify-between items-center px-3 py-1.5 text-xs">
                      <span style={{ color: isPlayer ? '#c4b5fd' : 'rgba(150,150,170,0.6)' }}>
                        {i + 1}위 {isPlayer ? '[ 우리 길드 ]' : `길드 ${String.fromCharCode(65 + (i < allScores.indexOf(partyPower) ? i : i - 1))}`}
                      </span>
                      <span className={isPlayer ? 'text-white font-bold' : 'text-slate-400'}>{score}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Result */}
          {done && result && (
            <div className="rounded-xl px-4 py-4"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <p className="text-center font-bold text-amber-300 mb-3">🏆 {result.rank}위 / {result.total}팀</p>
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div><p className="text-amber-300 font-bold">{result.goldReward}G</p><p className="text-xs" style={{ color: 'rgba(150,130,90,0.7)' }}>금화</p></div>
                <div><p className="text-yellow-300 font-bold">+{result.fameReward}</p><p className="text-xs" style={{ color: 'rgba(150,130,90,0.7)' }}>명성</p></div>
                <div><p className="text-cyan-300 font-bold">💎 {result.crystalReward ?? 0}</p><p className="text-xs" style={{ color: 'rgba(150,130,90,0.7)' }}>수정</p></div>
                <div><p className="text-green-300 font-bold">+{result.xpReward} XP</p><p className="text-xs" style={{ color: 'rgba(150,130,90,0.7)' }}>경험치</p></div>
              </div>
              {result.equipReward && (
                <div className="mt-3 px-3 py-2 rounded-lg text-center" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <p className="text-xs" style={{ color: 'rgba(160,140,200,0.6)' }}>장비 획득</p>
                  <p className="text-sm font-bold text-purple-300 mt-0.5">{result.equipReward.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(130,110,170,0.6)' }}>{result.equipReward.grade}등급 · {result.equipReward.slot}</p>
                </div>
              )}
              <button onClick={onClaim}
                className="gm-button-primary mt-4 w-full py-2 rounded-lg font-bold text-sm transition"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' }}>
                보상 수령
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface LaunchProps {
  mercs: Mercenary[]
  onLaunch: (mercIds: string[]) => void
  onClose: () => void
}

export function ExpeditionLaunchModal({ mercs, onLaunch, onClose }: LaunchProps) {
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const partyPower = selected.map(id => mercs.find(m => m.id === id)!).filter(Boolean).reduce((s, m) => s + effPower(m), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gm-modal-frame rounded-2xl w-[440px] overflow-hidden"
        style={{ background: '#0c0b1a', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 0 30px rgba(139,92,246,0.12)' }}>
        <div className="gm-panel-header px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
          <div>
            <h2 className="text-base font-bold text-white">⚔ 정기 원정 출발</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(160,140,200,0.6)' }}>사망 위험 없음 · 6시간 · 이후 12시간 쿨다운</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs mb-3" style={{ color: 'rgba(150,140,160,0.6)' }}>참가할 용병을 선택하세요. 총 전력이 높을수록 상위 순위 달성 확률이 높아집니다.</p>
          <div className="space-y-1.5 max-h-60 overflow-y-auto mb-4">
            {mercs.map(m => {
              const sel = selected.includes(m.id)
              return (
                <div key={m.id}
                  onClick={() => toggle(m.id)}
                  className="gm-slot-frame flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: sel ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${sel ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: GRADE_COLOR[m.grade] }}>{GRADE_STARS[m.grade]}</span>
                    <span className="text-sm text-white">{m.name}</span>
                    <span className="text-xs" style={{ color: 'rgba(130,130,150,0.6)' }}>Lv{m.level} {m.class}</span>
                  </div>
                  <span className="text-xs font-bold text-cyan-300">전력 {effPower(m)}</span>
                </div>
              )
            })}
            {mercs.length === 0 && <p className="text-sm text-center text-slate-500 py-4">대기 중인 용병이 없습니다</p>}
          </div>
          {selected.length > 0 && (
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-xs" style={{ color: 'rgba(150,140,160,0.6)' }}>선택: {selected.length}명</span>
              <span className="text-xs font-bold text-cyan-300">총 전력: {partyPower}</span>
            </div>
          )}
          <button
            onClick={() => selected.length > 0 && onLaunch(selected)}
            disabled={selected.length === 0}
            className="gm-button-primary w-full py-2 rounded-lg font-bold text-sm transition"
            style={{
              background: selected.length > 0 ? 'rgba(139,92,246,0.25)' : 'rgba(80,80,90,0.2)',
              color: selected.length > 0 ? '#c4b5fd' : 'rgba(130,130,150,0.5)',
              border: `1px solid ${selected.length > 0 ? 'rgba(139,92,246,0.4)' : 'rgba(80,80,90,0.3)'}`,
              cursor: selected.length > 0 ? 'pointer' : 'default',
            }}>
            원정 출발
          </button>
        </div>
      </div>
    </div>
  )
}
