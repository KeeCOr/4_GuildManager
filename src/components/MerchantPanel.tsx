import { useState, useEffect } from 'react'
import type { MerchantState, Equipment } from '../types'

const GRADE_COLOR: Record<string, string> = {
  S: '#e879f9', A: '#fbbf24', B: '#34d399', C: '#38bdf8', D: '#94a3b8',
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return '0초'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const rem = s % 60
  return m > 0 ? `${m}분 ${rem}초` : `${rem}초`
}

interface Props {
  merchant: MerchantState
  gold: number
  guildInventory: Equipment[]
  onBuy: (item: Equipment) => void
  onClose: () => void
}

export function MerchantPanel({ merchant, gold, guildInventory, onBuy, onClose }: Props) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const remaining = merchant.departsAt - now
  const inventoryFull = guildInventory.length >= 40

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl overflow-y-auto"
        style={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 440, width: '95vw', maxHeight: '80vh', padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-white font-bold text-lg">행상인</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">X</button>
        </div>
        <div className="text-sm mb-4" style={{ color: remaining < 120000 ? '#f87171' : '#94a3b8' }}>
          출발까지: {fmtCountdown(remaining)}
        </div>

        {inventoryFull && (
          <div className="rounded-lg p-2 mb-3 text-sm text-center" style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}>
            인벤토리가 가득 찼습니다
          </div>
        )}

        <div className="space-y-3">
          {merchant.stock.length === 0 ? (
            <div className="text-slate-500 text-center py-4">재고가 소진되었습니다.</div>
          ) : (
            merchant.stock.map(item => {
              const cost = Math.round(item.buyCost * 1.2)
              const canAfford = gold >= cost && !inventoryFull
              return (
                <div key={item.id} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold">{item.icon} {item.name}</span>
                        <span className="text-xs font-bold px-1 rounded" style={{ color: GRADE_COLOR[item.grade], border: `1px solid ${GRADE_COLOR[item.grade]}` }}>{item.grade}</span>
                      </div>
                      <div className="text-xs text-slate-400 flex gap-3 flex-wrap">
                        {item.powerBonus > 0 && <span>전력 +{item.powerBonus}</span>}
                        {item.atkBonus > 0 && <span>공격 +{item.atkBonus}</span>}
                        {item.trapBonus > 0 && <span>함정 +{item.trapBonus}</span>}
                        {item.survBonus > 0 && <span>생존 +{item.survBonus}</span>}
                        {item.moraleBonus > 0 && <span>사기 +{item.moraleBonus}</span>}
                      </div>
                      {item.passive && (
                        <div className="text-xs text-purple-400 mt-0.5">패시브: {item.passive.condition}</div>
                      )}
                      {item.setId && (
                        <div className="text-xs text-amber-400 mt-0.5">세트: {item.setId}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-amber-300 font-bold">{cost}G</span>
                      <button
                        onClick={() => onBuy(item)}
                        disabled={!canAfford}
                        className="text-xs px-3 py-1 rounded font-bold transition-all"
                        style={{
                          background: canAfford ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${canAfford ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)'}`,
                          color: canAfford ? '#86efac' : '#475569',
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                        }}
                      >
                        구매
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
