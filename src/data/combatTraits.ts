import type { Mercenary, Quest, Race } from '../types'

export type EncounterTrait = 'few' | 'horde' | 'undead' | 'flying'
export type MonsterSize = '소형' | '중형' | '대형' | '거대'

export interface MonsterEncounter {
  count: number
  size: MonsterSize
  element: Quest['element']
  undead: boolean
  flying: boolean
  label: string
}

export interface RaceTrait {
  role: string
  description: string
}

export const RACE_TRAITS: Record<Race, RaceTrait> = {
  인간: { role: '협업과 적응', description: '파티 성공률과 협동 안정성이 높음' },
  엘프: { role: '정찰과 마법 감응', description: '비행 적·자연 지역 대응과 특별 아이템 탐색에 강함' },
  드워프: { role: '강인함과 채굴', description: '장기전 생존과 광석 부산물 회수에 강함' },
  수인: { role: '추적과 사냥', description: '소수 강적 추적과 몬스터 부산물 회수에 강함' },
}

export const ELEMENT_TRAIT_DESC: Record<Quest['element'], string> = {
  불: '다수 몬스터 제압에 강함',
  얼음: '장기 의뢰의 컨디션 소모를 줄임',
  자연: '몬스터 부산물 회수량을 늘림',
  암흑: '함정 대응과 특별 아이템 발견에 강함',
  빛: '언데드 제압과 파티 생존을 도움',
}

export function inferEncounterTraits(quest: Quest): EncounterTrait[] {
  const encounter = getMonsterEncounter(quest)
  return [
    ...(encounter.count <= 3 ? ['few' as const] : []),
    ...(encounter.count >= 8 ? ['horde' as const] : []),
    ...(encounter.undead ? ['undead' as const] : []),
    ...(encounter.flying ? ['flying' as const] : []),
  ]
}

function stableQuestNumber(id: string): number {
  return [...(id ?? '')].reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 17)
}

export function getMonsterEncounter(quest: Quest): MonsterEncounter {
  const text = `${quest.name} ${quest.description}`
  const seed = stableQuestNumber(quest.id)
  const isHorde = /대군|무리|떼|군단|군세|다수|소탕|공성|전장/.test(text)
  const isFew = /보스|우두머리|거인|용|드래곤|강적|단일|암살|결투/.test(text)
  const count = isHorde ? 8 + seed % 13 : isFew ? 1 + seed % 3 : 3 + seed % 6
  const explicitGiant = /거인|용|드래곤|거대/.test(text)
  const size: MonsterSize = explicitGiant ? '거대'
    : count >= 12 ? (seed % 2 ? '소형' : '중형')
    : quest.difficulty >= 450 ? '대형'
    : quest.difficulty >= 180 ? (seed % 2 ? '중형' : '대형')
    : (seed % 3 === 0 ? '소형' : '중형')
  const undead = /언데드|유령|망령|해골|좀비|사령|묘지/.test(text)
  const flying = /비행|날개|하피|와이번|그리핀|도주|추격/.test(text)
  const tags = [undead ? '언데드' : null, flying ? '비행' : null].filter(Boolean).join('·')
  return { count, size, element: quest.element, undead, flying, label: `${count}마리 · ${size} · ${quest.element}속성${tags ? ` · ${tags}` : ''}` }
}

export function calcTraitSuccessBonus(quest: Quest, party: Mercenary[]): number {
  const monster = getMonsterEncounter(quest)
  let bonus = 0
  if (monster.count <= 3 && party.some(m => m.class === '전사')) bonus += 8
  if (monster.count >= 8 && party.some(m => m.class === '마법사')) bonus += 10
  if (monster.flying && party.some(m => m.class === '궁수')) bonus += 10
  if ((monster.size === '대형' || monster.size === '거대') && party.some(m => m.class === '궁수')) bonus += 4
  if (monster.undead && party.some(m => m.class === '성직자')) bonus += 12
  bonus += Math.min(6, party.filter(m => m.race === '인간').length * 2)
  if (party.some(m => m.race === '엘프') && (monster.flying || quest.element === '자연')) bonus += 5
  if (party.some(m => m.race === '수인') && monster.count <= 3) bonus += 5
  if (party.some(m => m.race === '드워프') && monster.size === '거대') bonus += 4
  if (party.some(m => m.element === '불') && monster.count >= 8) bonus += 5
  if (party.some(m => m.element === '빛') && monster.undead) bonus += 7
  return bonus
}

export function calcTraitDeathRiskMultiplier(quest: Quest, merc: Mercenary, party: Mercenary[]): number {
  const monster = getMonsterEncounter(quest)
  let multiplier = 1
  const hasWarrior = party.some(m => m.class === '전사')
  const hasCleric = party.some(m => m.class === '성직자')
  if (hasWarrior) multiplier *= merc.class === '전사' ? 1.12 : 0.72
  if (hasCleric && merc.class === '전사') multiplier *= 0.72
  if (hasCleric && monster.undead) multiplier *= 0.75
  if (monster.count >= 8) multiplier *= merc.class === '마법사' ? 0.78 : 1.08
  if (monster.flying && merc.class === '궁수') multiplier *= 0.75
  if (monster.undead && merc.class === '성직자') multiplier *= 0.70
  if (merc.race === '드워프' && quest.duration >= 4) multiplier *= 0.82
  if (merc.race === '드워프' && monster.size === '거대') multiplier *= 0.85
  if (merc.element === '빛' && monster.undead) multiplier *= 0.82
  return multiplier
}

export function calcTraitConditionDrain(quest: Quest, merc: Mercenary): number {
  let multiplier = 1
  if (merc.element === '얼음' && quest.element === '얼음') multiplier *= 0.5
  if (merc.element === '얼음' && quest.duration >= 3) multiplier *= 0.7
  if (merc.race === '드워프' && quest.duration >= 4) multiplier *= 0.85
  if (merc.class === '성직자' && quest.duration >= 4) multiplier *= 0.9
  return Math.max(1, Math.round(quest.conditionDrain * multiplier))
}
