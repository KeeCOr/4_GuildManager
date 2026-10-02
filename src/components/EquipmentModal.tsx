import type { Mercenary, Equipment, EquipSlot, Quest } from '../types'
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
  currentQuest?: Quest
  onEquip: (mercId: string, slot: EquipSlot, itemId: string | null) => void
  onClose: () => void
}

function recommendedForCurrentQuest(quest: Quest | undefined, merc: Mercenary, item: Equipment, equippedItem: Equipment | null): string | null {
  if (!quest) return null

  const currentPower = equippedItem ? powerScore(equippedItem) : 0
  const nextPower = powerScore(item)
  const reasons: string[] = []

  if (nextPower > currentPower) reasons.push(`전력 +${nextPower - currentPower}`)
  if (quest.trapFocus && item.trapBonus > (equippedItem?.trapBonus ?? 0)) reasons.push(`함정 +${item.trapBonus - (equippedItem?.trapBonus ?? 0)}`)
  if (quest.deathRisk >= 0.12 && item.survBonus > (equippedItem?.survBonus ?? 0)) reasons.push(`생존 +${item.survBonus - (equippedItem?.survBonus ?? 0)}`)
  if (quest.deathRisk >= 0.12 && item.atkBonus > (equippedItem?.atkBonus ?? 0)) reasons.push(`공격 +${item.atkBonus - (equippedItem?.atkBonus ?? 0)}`)
  if (item.passive) reasons.push(item.passive.condition ?? '패시브 보유')

  if (reasons.length === 0) return null
  return `추천 퀘스트: ${quest.name} · ${reasons.slice(0, 2).join(' / ')}`
}

export function EquipmentModal({ merc, guildInventory, currentQuest, onEquip, onClose }: Props) {
  const equipped = getEquipped(merc.equipment)
  const setBonuses = getSetBonuses(equipped)
  const slots: EquipSlot[] = ['weapon', 'head', 'body', 'accessory']

  const inventoryForSlot = (slot: EquipSlot) =>
    guildInventory.filter(e => e.slot === slot)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="gm-modal-frame gm-equipment-modal rounded-2xl overflow-y-auto"
        style={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 480, width: '95vw', maxHeight: '85vh', padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="gm-panel-header flex justify-between items-start gap-3 mb-7">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight break-words">{merc.name} - 장비 관리</h2>
            {currentQuest && <div className="text-xs text-sky-300 mt-1">현재 퀘스트: {currentQuest.name}</div>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">X</button>
        </div>

        {/* Equipped slots */}
        <div className="space-y-2 mb-4">
          {slots.map(slot => {
            const itemId = merc.equipment[slot]
            const item = itemId ? findEquip(itemId) ?? null : null
            return (
              <div key={slot} className="gm-slot-frame gm-equipment-equipped-slot rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 text-sm">{SLOT_LABEL[slot]}</span>
                  {item ? (
                    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                      <span className="min-w-0 text-right text-sm text-white break-words">{item.icon} {item.name}</span>
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
                  <div className="mt-1 text-xs text-slate-400 flex gap-3 flex-wrap">
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
                {sb.set.name} {sb.bonus.requiredCount}세트 - {sb.bonus.description}
              </div>
            ))}
          </div>
        )}

        {/* Guild Inventory */}
        <div className="gm-equipment-inventory border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="text-slate-400 text-sm mb-2">
            길드 인벤토리 ({guildInventory.length}/40) - 클릭하면 해당 슬롯에 장착
          </div>
          {slots.map(slot => {
            const items = inventoryForSlot(slot)
            if (items.length === 0) return null
            const equippedItem = merc.equipment[slot] ? findEquip(merc.equipment[slot]!) ?? null : null
            return (
              <div key={slot} className="mb-3">
                <div className="text-slate-500 text-xs mb-1">{SLOT_LABEL[slot]}</div>
                <div className="gm-equipment-item-grid flex flex-wrap gap-1">
                  {items.map(item => {
                    const isEquipped = merc.equipment[slot] === item.id
                    const recommendation = recommendedForCurrentQuest(currentQuest, merc, item, equippedItem)
                    return (
                      <button
                        key={item.id}
                        onClick={() => onEquip(merc.id, slot, item.id)}
                        className="gm-button-primary gm-equipment-item-button text-xs px-2 py-1 rounded transition-all"
                        style={{
                          background: recommendation ? 'rgba(14,165,233,0.18)' : isEquipped ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${recommendation ? 'rgba(14,165,233,0.45)' : isEquipped ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
                          color: GRADE_COLOR[item.grade],
                        }}
                        title={`${item.name} | 전력+${item.powerBonus} 공격+${item.atkBonus} 함정+${item.trapBonus} 생존+${item.survBonus}${item.passive ? ' | ' + item.passive.condition : ''}${recommendation ? ' | ' + recommendation : ''}`}
                      >
                        {item.icon} {item.name} <span style={{ opacity: 0.7 }}>{item.grade}</span>
                        {recommendation && <span className="ml-1 text-sky-200">추천</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {guildInventory.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="text-4xl mb-3">BAG</div>
              <div className="font-semibold text-slate-400 mb-1">장비가 없어요</div>
              <div className="text-sm text-slate-600">상인에게서 구매하거나 던전 보상을 받으세요</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}