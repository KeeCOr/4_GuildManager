import type { ActiveDungeon, Mercenary, Quest } from '../types'
import { dungeonFloorDifficulty, dungeonFloorDeathRisk, dungeonFloorGold, dungeonFloorXp } from '../data/dungeons'
import dungeonEntrance from '../assets/Generated/dungeon-entrance.png'

const ELEMENT_ICON: Record<string, string> = {
  fire: 'FIRE',
  ice: 'ICE',
  lightning: 'LIGHT',
  nature: 'NATURE',
  dark: 'DARK',
}

interface Props {
  dungeon: ActiveDungeon
  floorQuest: Quest
  availableMercs: Mercenary[]
  onDispatch: (questId: string, mercIds: string[]) => void
  onAbandon: () => void
  onClose: () => void
}

export function DungeonPanel({ dungeon, floorQuest, availableMercs: _availableMercs, onDispatch: _onDispatch, onAbandon, onClose }: Props) {
  const floor = dungeon.currentFloor
  const maxFloor = dungeon.maxFloor
  const progress = Math.round((dungeon.clearedFloors / maxFloor) * 100)
  const floorDiff = dungeonFloorDifficulty(floorQuest.difficulty, floor)
  const floorRisk = dungeonFloorDeathRisk(floorQuest.deathRisk, floor)
  const floorGold = dungeonFloorGold(floor)
  const floorXp = dungeonFloorXp(floor)
  const hasEquip = floor >= 5
  const elementLabel = String(dungeon.element)
  const elementIcon = ELEMENT_ICON[elementLabel] ?? elementLabel

  const isDispatched = !!dungeon.activeDungeonQuestId
  const isCompleted = dungeon.status === 'completed'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="gm-modal-frame rounded-2xl"
        style={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 440, width: '95vw', padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="mb-4 overflow-hidden rounded-xl"
          style={{
            height: 128,
            backgroundImage: `linear-gradient(90deg, rgba(10,8,20,0.18), rgba(10,8,20,0.72)), url(${dungeonEntrance})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 58%',
            border: '1px solid rgba(167,139,250,0.34)',
            boxShadow: 'inset 0 -28px 46px rgba(6,4,12,0.55)',
          }}
        />

        <div className="gm-panel-header flex justify-between items-center mb-6">
          <div>
            <h2 className="text-white font-bold text-lg">{dungeon.name}</h2>
            <div className="text-slate-400 text-sm">
              {elementIcon} {elementLabel} element - Floor {floor}/{maxFloor}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">X</button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Progress</span><span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: '#7c3aed' }} />
          </div>
        </div>

        {isCompleted ? (
          <div className="dungeon-clear-flash rounded-xl text-center py-6" style={{ border: '1px solid rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.06)' }}>
            <div className="dungeon-clear-text text-amber-300 font-bold text-2xl mb-1">
              Dungeon Cleared
            </div>
            <div className="text-emerald-400 text-sm mt-1">All floors have been conquered.</div>
          </div>
        ) : (
          <>
            <div className="gm-slot-frame rounded-lg p-3 mb-4 space-y-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="text-white text-sm font-bold">Current Floor: {floor}</div>
              <div className="text-xs text-slate-400 flex gap-4 flex-wrap">
                <span>Difficulty: {floorDiff}</span>
                <span>Death Risk: {(floorRisk * 100).toFixed(1)}%</span>
                <span>Reward: {floorGold}G / {floorXp}XP</span>
                {hasEquip && <span className="text-amber-300">Equipment drop available</span>}
              </div>
            </div>

            {isDispatched ? (
              <div className="text-center py-4 text-sky-400 text-sm">
                Dispatch in progress. Waiting for floor quest completion.
              </div>
            ) : (
              <div className="text-slate-400 text-sm mb-3">
                Assign mercenaries through the quest flow and push deeper into the dungeon.
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 mt-4">
          {isCompleted ? (
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-bold dungeon-reward-pulse"
              style={{ background: 'rgba(251,191,36,0.25)', color: '#fde68a', border: '1px solid rgba(251,191,36,0.5)' }}
            >
              Claim Rewards and Close
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
              >
                Close
              </button>
              <button
                onClick={onAbandon}
                className="py-2 px-4 rounded-lg text-sm font-bold"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}
              >
                Abandon
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}