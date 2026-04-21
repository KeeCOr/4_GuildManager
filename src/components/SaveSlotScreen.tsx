import type { SaveSlotData } from '../types'

interface SaveSlotScreenProps {
  slots: (SaveSlotData | null)[]
  onSelectSlot: (slotIdx: number) => void
  onClearSlot: (slotIdx: number) => void
}

export function SaveSlotScreen({ slots, onSelectSlot, onClearSlot }: SaveSlotScreenProps) {
  return (
    <div className="w-full h-full flex items-center justify-center"
      style={{ background: 'linear-gradient(180deg,#03030a 0%,#08062a 40%,#160840 100%)' }}>
      <div className="flex flex-col items-center gap-8 w-full max-w-lg px-6">

        {/* 타이틀 */}
        <div className="text-center">
          <div className="text-5xl mb-3">🏰</div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">용병단 길드</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(150,110,50,0.8)' }}>Medieval Mercenary Manager</p>
        </div>

        {/* 슬롯 목록 */}
        <div className="w-full space-y-3">
          {slots.map((slot, idx) => (
            <div key={idx} className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <button
                className="w-full text-left px-5 py-4 transition hover:brightness-125"
                onClick={() => onSelectSlot(idx)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-300">슬롯 {idx + 1}</p>
                    {slot ? (
                      <>
                        <p className="text-base font-extrabold text-white mt-0.5">{slot.name}</p>
                        <div className="flex gap-3 mt-1 text-sm flex-wrap" style={{ color: 'rgba(160,140,100,0.8)' }}>
                          <span>👥 {slot.mercs.length}명</span>
                          <span>⭐ {slot.campaignState.fame}</span>
                          <span>💰 {slot.campaignState.gold}G</span>
                          <span>⚔️ {slot.activeQuests.length}건 파견중</span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: 'rgba(100,90,70,0.6)' }}>
                          {new Date(slot.timestamp).toLocaleDateString('ko-KR')}{' '}
                          {new Date(slot.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm mt-1" style={{ color: 'rgba(100,90,70,0.5)' }}>새 게임 시작</p>
                    )}
                  </div>
                  <span className="text-2xl ml-4 flex-shrink-0" style={{ color: 'rgba(180,140,60,0.7)' }}>
                    {slot ? '▶' : '＋'}
                  </span>
                </div>
              </button>
              {slot && (
                <div className="border-t px-5 py-2 flex justify-end"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={e => { e.stopPropagation(); onClearSlot(idx) }}
                    className="text-sm rounded-lg px-3 py-1 transition hover:brightness-125"
                    style={{ color: 'rgba(239,68,68,0.6)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    🗑 삭제
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-sm" style={{ color: 'rgba(100,90,70,0.4)' }}>슬롯을 선택하면 자동 저장됩니다</p>
      </div>
    </div>
  )
}
