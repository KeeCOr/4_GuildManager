import { useCallback } from 'react'
import type { ActiveDungeon, Equipment } from '../types'
import {
  dungeonFloorDifficulty, dungeonFloorDeathRisk,
  dungeonFloorGold, dungeonFloorXp,
  dungeonClearBonusGold, dungeonClearBonusFame,
} from '../data/dungeons'
import { rollQuestDrop } from '../data/equipment'

interface UseDungeonOptions {
  activeDungeon: ActiveDungeon | null
  setActiveDungeon: (d: ActiveDungeon | null) => void
  guildInventory: Equipment[]
  setGuildInventory: (fn: (prev: Equipment[]) => Equipment[]) => void
  log: (msg: string) => void
  onReward: (gold: number, fame: number) => void
}

export function useDungeon({
  activeDungeon, setActiveDungeon,
  guildInventory, setGuildInventory,
  log, onReward,
}: UseDungeonOptions) {

  /** Call after a dungeon floor ActiveQuest completes successfully */
  const onFloorCleared = useCallback((floor: number, questDifficulty: number) => {
    if (!activeDungeon) return
    const gold = dungeonFloorGold(floor)
    const xp   = dungeonFloorXp(floor)
    log(`[${activeDungeon.name}] ${floor}층 클리어! +${gold}G / +${xp}XP`)
    onReward(gold, 0)

    // Equipment drop on floor 5+
    if (floor >= 5) {
      const drop = rollQuestDrop(questDifficulty * 1.2) // slightly higher chance
      if (drop && guildInventory.length < 40) {
        setGuildInventory(prev => [...prev, drop])
        log(`던전 드롭: [${drop.icon} ${drop.name} ${drop.grade}등급]`)
      }
    }

    const clearedFloors = activeDungeon.clearedFloors + 1
    if (clearedFloors >= activeDungeon.maxFloor) {
      // Full clear
      const bonusGold = dungeonClearBonusGold(activeDungeon.maxFloor)
      const bonusFame = dungeonClearBonusFame(activeDungeon.maxFloor)
      onReward(bonusGold, bonusFame)

      // 1-2 A/S items
      const dropCount = 1 + (Math.random() < 0.4 ? 1 : 0)
      for (let i = 0; i < dropCount; i++) {
        if (guildInventory.length + i < 40) {
          const drop2 = rollQuestDrop(600 + i) // guaranteed high tier
          if (drop2) {
            setGuildInventory(prev => [...prev, drop2])
            log(`완전 클리어 보상: [${drop2.icon} ${drop2.name} ${drop2.grade}등급]`)
          }
        } else {
          log('인벤토리 가득 참 — 클리어 장비 보상 획득 불가')
        }
      }

      log(`[${activeDungeon.name}] 완전 클리어! +${bonusGold}G / 명성 +${bonusFame}`)
      setActiveDungeon({ ...activeDungeon, clearedFloors, status: 'completed' })
    } else {
      setActiveDungeon({
        ...activeDungeon,
        clearedFloors,
        currentFloor: activeDungeon.currentFloor + 1,
        activeDungeonQuestId: undefined,
      })
    }
  }, [activeDungeon, guildInventory, setActiveDungeon, setGuildInventory, log, onReward])

  /** Call when a dungeon floor quest fails */
  const onFloorFailed = useCallback(() => {
    if (!activeDungeon) return
    log(`[${activeDungeon.name}] ${activeDungeon.currentFloor}층 공략 실패. 다시 파견하세요.`)
    setActiveDungeon({ ...activeDungeon, activeDungeonQuestId: undefined })
  }, [activeDungeon, setActiveDungeon, log])

  /** Abandon the dungeon */
  const abandonDungeon = useCallback(() => {
    if (!activeDungeon) return
    log(`[${activeDungeon.name}] 던전 포기. 이제까지의 보상은 유지됩니다.`)
    setActiveDungeon(null)
  }, [activeDungeon, setActiveDungeon, log])

  return {
    onFloorCleared,
    onFloorFailed,
    abandonDungeon,
    dungeonFloorDifficulty,
    dungeonFloorDeathRisk,
  }
}
