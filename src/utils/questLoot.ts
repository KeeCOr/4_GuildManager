import type { Mercenary, Quest } from '../types'
import { getMonsterEncounter } from '../data/combatTraits'

export type QuestMaterialId = 'hide' | 'bone' | 'ore' | 'herb' | 'essence'
export type QuestMaterialStock = Record<QuestMaterialId, number>

export interface QuestItem {
  id: string
  name: string
  rarity: '희귀' | '영웅' | '전설'
  questId: string
  sourceQuestName: string
  description: string
  obtainedAt: number
}

export interface QuestLootResult {
  strongerMonster: boolean
  monsterThreatMultiplier: number
  materials: Array<{ id: QuestMaterialId; name: string; quantity: number }>
  abundantMaterials: boolean
  specialItem: QuestItem | null
  notableReasons: string[]
  performanceScore: number
}

export const EMPTY_QUEST_MATERIALS: QuestMaterialStock = { hide: 0, bone: 0, ore: 0, herb: 0, essence: 0 }
export const QUEST_MATERIAL_NAMES: Record<QuestMaterialId, string> = {
  hide: '몬스터 가죽', bone: '몬스터 뼈', ore: '마력 광석', herb: '변이 약초', essence: '마력 정수',
}

const ELEMENT_MATERIAL: Record<Quest['element'], QuestMaterialId> = {
  불: 'ore', 얼음: 'essence', 자연: 'herb', 암흑: 'bone', 빛: 'hide',
}

export function rollQuestLoot(quest: Quest, success: boolean, random = Math.random, party: Mercenary[] = []): QuestLootResult {
  const encounter = getMonsterEncounter(quest)
  const threatChance = Math.min(0.36, 0.10 + quest.difficulty / 2400)
  const strongerMonster = random() < threatChance
  const monsterThreatMultiplier = strongerMonster ? Number((1.2 + random() * 0.8).toFixed(2)) : 1
  const base = Math.max(1, Math.ceil(quest.difficulty / 90))
  const haulRoll = random()
  const rogueCount = party.filter(m => m.class === '도적').length
  const haulMultiplier = haulRoll > Math.max(0.58, 0.82 - rogueCount * 0.08) ? 3 : haulRoll > 0.52 ? 2 : 1
  const abundantMaterials = success && haulMultiplier >= 3
  const primary = ELEMENT_MATERIAL[quest.element]
  const resourceMultiplier = 1
    + Math.min(0.8, encounter.count * 0.04)
    + (encounter.size === '거대' ? 0.45 : encounter.size === '대형' ? 0.25 : 0)
    + party.filter(m => m.element === '자연').length * 0.12
    + party.filter(m => m.race === '수인').length * 0.10
    + (primary === 'ore' ? party.filter(m => m.race === '드워프').length * 0.20 : 0)
  const primaryQty = success ? Math.max(1, Math.round(base * haulMultiplier * resourceMultiplier)) : Math.max(0, Math.floor(base / 2))
  const secondary: QuestMaterialId = quest.trapFocus ? 'ore' : (primary === 'hide' ? 'bone' : 'hide')
  const materials = primaryQty > 0 ? [
    { id: primary, name: QUEST_MATERIAL_NAMES[primary], quantity: primaryQty },
    { id: secondary, name: QUEST_MATERIAL_NAMES[secondary], quantity: success ? Math.max(1, Math.floor(primaryQty / 2)) : 0 },
  ].filter(x => x.quantity > 0) : []

  const discoveryBonus = rogueCount * 0.06
    + party.filter(m => m.race === '엘프').length * 0.025
    + party.filter(m => m.element === '암흑').length * 0.035
  const itemChance = success ? Math.min(0.55, 0.06 + quest.difficulty / 3000 + discoveryBonus) : Math.min(0.12, 0.015 + discoveryBonus * 0.3)
  const foundSpecial = random() < itemChance
  const rarity: QuestItem['rarity'] = quest.difficulty >= 500 ? '전설' : quest.difficulty >= 240 ? '영웅' : '희귀'
  const specialItem = foundSpecial ? {
    id: `quest-item-${quest.id}-${Date.now()}-${Math.floor(random() * 1_000_000)}`,
    name: `${quest.name}의 증표`, rarity, questId: quest.id, sourceQuestName: quest.name,
    description: '의뢰 현장에서만 발견되는 고유 물품. 후속 의뢰와 길드 사건에 사용할 수 있습니다.',
    obtainedAt: Date.now(),
  } : null

  const notableReasons = [
    ...(strongerMonster ? [`예상보다 강한 몬스터 격파 (위협도 ×${monsterThreatMultiplier})`] : []),
    ...(abundantMaterials ? ['몬스터 부산물 대량 회수'] : []),
    ...(specialItem ? [`특별 퀘스트 아이템 「${specialItem.name}」 확보`] : []),
  ]
  return { strongerMonster, monsterThreatMultiplier, materials, abundantMaterials, specialItem, notableReasons, performanceScore: notableReasons.length }
}

export function addQuestLoot(stock: QuestMaterialStock, loot: QuestLootResult): QuestMaterialStock {
  const next = { ...stock }
  for (const material of loot.materials) next[material.id] += material.quantity
  return next
}
