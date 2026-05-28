import type { Mercenary, Equipment, EquipSlot } from '../types'
import { getEquipped, getSetBonuses, powerScore, findEquip } from '../data/equipment'

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: '무기', head: '머리', body: '몸통', accessory: '장신구',
}

const GRADE_COLOR: Record<string, string> = {
  S: '#e879f9', A: '#fbbf24', B: '#34d399', C: '#38bdf8', D: '#94a3b8',
}

interface Props {
  merc: Mercenary
  guildInventory: Equipment[]
  onEquip: (mercId: string, slot: EquipSlot, itemId: string | null) => void
  onClose: () => void
}

export function EquipmentModal({ merc, guildInventory, onEquip, onClose }: Props) {
  const equipped = getEquipped(merc.equipment)
  const setBonuses = getSetBonuses(equipped)
  const slots: EquipSlot[] = ['weapon', 'head', 'body', 'accessory']

  const inventoryForSlot = (slot: EquipSlot) =>
    guildInventory.filter(e => e.slot === slot)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="gm-modal-frame rounded-2xl overflow-y-auto"
        style={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 480, width: '95vw', maxHeight: '85vh', padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="gm-panel-header flex justify-between items-center mb-7">
          <h2 className="text-white font-bold text-lg">{merc.name} — 장비 관리</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">X</button>
        </div>

        {/* Equipped slots */}
        <div className="space-y-2 mb-4">
          {slots.map(slot => {
            const itemId = merc.equipment[slot]
            const item = itemId ? findEquip(itemId) : null
            return (
              <div key={slot} className="gm-slot-frame rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">{SLOT_LABEL[slot]}</span>
                  {item ? (
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{item.icon} {item.name}</span>
                      <span className="text-xs font-bold px-1 rounded" style={{ color: GRADE_COLOR[item.grade], border: `1px solid ${GRADE_COLOR[item.grade]}` }}>{item.grade}</span>
                      <button
                        className="text-xs text-red-400 hover:text-red-300 ml-1"
                        onClick={() => onEquip(merc.id, slot, null)}
                      >해제</button>
                    </div>
                  ) : (
                    <span className="text-slate-600 text-sm">(없음)</span>
                  )}
                </div>
                {item && (
                  <div className="mt-1 text-xs text-slate-400 flex gap-3">
                    {item.powerBonus > 0 && <span>전력+{item.powerBonus}</span>}
                    {item.atkBonus > 0 && <span>공격+{item.atkBonus}</span>}
                    {item.trapBonus > 0 && <span>함정+{item.trapBonus}</span>}
                    {item.survBonus > 0 && <span>생존+{item.survBonus}</span>}
                    {item.passive && <span className="text-purple-400">{item.passive.condition}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Set bonuses */}
        {setBonuses.length > 0 && (
          <div className="rounded-lg p-3 mb-4" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <div className="text-purple-300 text-sm font-bold mb-1">세트 효과</div>
            {setBonuses.map((sb, i) => (
              <div key={i} className="text-xs text-purple-200">
                {sb.set.name} {sb.bonus.requiredCount}세트 — {sb.bonus.description}
              </div>
            ))}
          </div>
        )}

        {/* Guild Inventory */}
        <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="text-slate-400 text-sm mb-2">
            길드 인벤토리 ({guildInventory.length}/40) — 클릭하면 해당 슬롯에 장착
          </div>
          {slots.map(slot => {
            const items = inventoryForSlot(slot)
            if (items.length === 0) return null
            return (
              <div key={slot} className="mb-3">
                <div className="text-slate-500 text-xs mb-1">{SLOT_LABEL[slot]}</div>
                <div className="flex flex-wrap gap-1">
                  {items.map(item => {
                    const isEquipped = merc.equipment[slot] === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => onEquip(merc.id, slot, item.id)}
                        className="gm-button-primary text-xs px-2 py-1 rounded transition-all"
                        style={{
                          background: isEquipped ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${isEquipped ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
                          color: GRADE_COLOR[item.grade],
                        }}
                        title={`${item.name} | 전력+${item.powerBonus} 공격+${item.atkBonus} 함정+${item.trapBonus} 생존+${item.survBonus}${item.passive ? ' | ' + item.passive.condition : ''}`}
                      >
                        {item.icon} {item.name} <span style={{ opacity: 0.7 }}>{item.grade}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {guildInventory.length === 0 && (
            <div className="text-slate-600 text-sm">인벤토리가 비어있습니다.</div>
          )}
        </div>
      </div>
    </div>
  )
}
