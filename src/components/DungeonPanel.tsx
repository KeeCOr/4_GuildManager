import type { ActiveDungeon, Mercenary, Quest } from '../types'
import { dungeonFloorDifficulty, dungeonFloorDeathRisk, dungeonFloorGold, dungeonFloorXp } from '../data/dungeons'

const ELEMENT_ICON: Record<string, string> = {
  불: '불', 얼음: '얼음', 번개: '번개', 자연: '자연', 암흑: '암흑', 빛: '빛',
}

interface Props {
  dungeon: ActiveDungeon
  /** A synthetic Quest representing the current floor (for dispatch) */
  floorQuest: Quest
  availableMercs: Mercenary[]
  onDispatch: (questId: string, mercIds: string[]) => void
  onAbandon: () => void
  onClose: () => void
}

export function DungeonPanel({ dungeon, floorQuest, availableMercs, onDispatch, onAbandon, onClose }: Props) {
  const floor = dungeon.currentFloor
  const maxFloor = dungeon.maxFloor
  const progress = Math.round((dungeon.clearedFloors / maxFloor) * 100)
  const floorDiff = dungeonFloorDifficulty(floorQuest.difficulty, floor)
  const floorRisk = dungeonFloorDeathRisk(floorQuest.deathRisk, floor)
  const floorGold = dungeonFloorGold(floor)
  const floorXp   = dungeonFloorXp(floor)
  const hasEquip  = floor >= 5

  const isDispatched = !!dungeon.activeDungeonQuestId
  const isCompleted  = dungeon.status === 'completed'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl"
        style={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 440, width: '95vw', padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-white font-bold text-lg">{dungeon.name}</h2>
            <div className="text-slate-400 text-sm">
              {ELEMENT_ICON[dungeon.element]} {dungeon.element} 속성 · {floor}/{maxFloor}층
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">X</button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>진행도</span><span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: '#7c3aed' }} />
          </div>
        </div>

        {isCompleted ? (
          <div className="text-center py-6 text-emerald-400 font-bold text-lg">
            던전 완전 클리어!
          </div>
        ) : (
          <>
            {/* Floor info */}
            <div className="rounded-lg p-3 mb-4 space-y-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="text-white text-sm font-bold">현재 층: {floor}층</div>
              <div className="text-xs text-slate-400 flex gap-4 flex-wrap">
                <span>난이도: {floorDiff}</span>
                <span>사망위험: {(floorRisk * 100).toFixed(1)}%</span>
                <span>보상: {floorGold}G / {floorXp}XP</span>
                {hasEquip && <span className="text-amber-300">장비 드롭 가능</span>}
              </div>
            </div>

            {isDispatched ? (
              <div className="text-center py-4 text-sky-400 text-sm">
                파견 중... 퀘스트 완료 대기
              </div>
            ) : (
              <div className="text-slate-400 text-sm mb-3">
                일반 퀘스트 파견과 동일하게 용병을 배치하고 파견하세요.
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
          >
            닫기
          </button>
          {!isCompleted && (
            <button
              onClick={onAbandon}
              className="py-2 px-4 rounded-lg text-sm font-bold"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}
            >
              던전 포기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
