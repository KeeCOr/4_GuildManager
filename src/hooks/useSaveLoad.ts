import { useState } from 'react'
import type { SaveSlotData } from '../types'
import { DEFAULT_WEAPON } from '../data/weapons'
import { drawQuestPool } from '../utils/quest'

const SAVE_KEY = 'sma_guild_saves'
const NUM_SLOTS = 3

export function loadAllSlots(): (SaveSlotData | null)[] {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return Array(NUM_SLOTS).fill(null)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : Array(NUM_SLOTS).fill(null)
  } catch {
    return Array(NUM_SLOTS).fill(null)
  }
}

function persistSlots(slots: (SaveSlotData | null)[]) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(slots))
}

export function useSaveLoad() {
  const [slots, setSlots] = useState<(SaveSlotData | null)[]>(loadAllSlots)

  const saveToSlot = (slotIdx: number, data: Omit<SaveSlotData, 'name' | 'timestamp'>) => {
    const entry: SaveSlotData = {
      ...data,
      name: `Day ${data.day}`,
      timestamp: Date.now(),
    }
    setSlots(prev => {
      const next = [...prev]
      next[slotIdx] = entry
      persistSlots(next)
      return next
    })
  }

  const loadFromSlot = (slotIdx: number): SaveSlotData | null =>
    slots[slotIdx] ?? null

  const clearSlot = (slotIdx: number) => {
    setSlots(prev => {
      const next = [...prev]
      next[slotIdx] = null
      persistSlots(next)
      return next
    })
  }

  const migrateSlotData = (data: SaveSlotData): SaveSlotData => ({
    ...data,
    mercs: data.mercs.map(m => {
      const migrated = (['대장간', '숙소'] as string[]).includes(m.room)
        ? { ...m, room: '식당' as const }
        : m
      return { ...migrated, weaponId: migrated.weaponId ?? DEFAULT_WEAPON[migrated.class] }
    }),
    activeQuests: data.activeQuests.map((aq: any) => {
      if (typeof aq.completesAt === 'number') return aq
      const turns = Math.max(1, aq.turnsLeft ?? 1)
      const dur = turns * 5 * 60 * 1000
      return { questId: aq.questId, assignedMercIds: aq.assignedMercIds, completesAt: Date.now() + dur, durationMs: dur }
    }),
    questPool: data.questPool ?? drawQuestPool(
      data.buildings.hall,
      data.activeQuests.map(aq => aq.questId),
      data.campaignState.fame
    ),
    roomLevels: data.roomLevels ?? { 길드마스터룸: 1, 훈련소: 1, 식당: 1 },
  })

  return { slots, saveToSlot, loadFromSlot, clearSlot, migrateSlotData }
}
