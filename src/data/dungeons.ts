import type { ActiveDungeon } from '../types'

export const DUNGEON_NAMES = [
  '잊혀진 지하 묘지', '부서진 요새 지하', '어둠의 동굴', '고대 신전 지하',
  '버려진 광산', '마족의 소굴', '혼돈의 미궁', '저주받은 성채 지하',
  '심연의 동굴', '타락한 신전', '불타는 지하 용암굴', '서리 제단',
]

export const DUNGEON_ELEMENT_POOL: ActiveDungeon['element'][] = [
  '불', '얼음', '자연', '암흑', '빛',
]

/** Dungeon trigger probability by quest tier (0–1) */
export const DUNGEON_TRIGGER_CHANCE: Record<number, number> = {
  1: 0.03, 2: 0.05, 3: 0.08, 4: 0.12, 5: 0.30,
}

/** Min/max floor range unlocked by quest tier */
export const DUNGEON_FLOOR_RANGE: Record<number, [number, number]> = {
  1: [1, 3], 2: [2, 5], 3: [4, 7], 4: [6, 10], 5: [8, 10],
}

/**
 * Base difficulty for dungeon floor N.
 * questDifficulty: the difficulty of the quest that triggered the dungeon.
 */
export const dungeonFloorDifficulty = (questDifficulty: number, floor: number): number =>
  Math.round(questDifficulty * 0.8 * (1 + floor * 0.3))

/**
 * Death risk for dungeon floor N.
 * baseRisk: quest.deathRisk
 */
export const dungeonFloorDeathRisk = (baseRisk: number, floor: number): number =>
  Math.min(0.98, baseRisk * (1 + floor * 0.15))

/** Gold reward per floor */
export const dungeonFloorGold = (floor: number): number => floor * 80

/** XP reward per floor */
export const dungeonFloorXp = (floor: number): number => floor * 25

/** Completion bonus gold */
export const dungeonClearBonusGold = (maxFloor: number): number => maxFloor * 200

/** Completion bonus fame */
export const dungeonClearBonusFame = (maxFloor: number): number => maxFloor * 5

/** Create a new ActiveDungeon from a quest completion */
export const createDungeon = (questDifficulty: number, tier: number): ActiveDungeon => {
  const [minF, maxF] = DUNGEON_FLOOR_RANGE[tier]
  const maxFloor = minF + Math.floor(Math.random() * (maxF - minF + 1))
  const element = DUNGEON_ELEMENT_POOL[Math.floor(Math.random() * DUNGEON_ELEMENT_POOL.length)]
  const name = DUNGEON_NAMES[Math.floor(Math.random() * DUNGEON_NAMES.length)]
  return {
    id: `dg-${Date.now().toString(36)}`,
    name,
    maxFloor,
    currentFloor: 1,
    clearedFloors: 0,
    element,
    status: 'active',
  }
}
