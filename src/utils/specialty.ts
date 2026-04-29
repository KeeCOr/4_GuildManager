import type { Mercenary, SpecialtyTag, Quest } from '../types'

interface TagCondition {
  questType?: string
  minDeathRisk?: number
  partySize?: number
  maxCondition?: number
  element?: string
  requiredCount: number
}

const TAG_CONDITIONS: Record<SpecialtyTag, TagCondition> = {
  dungeon_veteran:  { questType: 'dungeon',  requiredCount: 3 },
  escort_expert:    { questType: 'escort',   requiredCount: 3 },
  trap_specialist:  { questType: 'trap',     requiredCount: 5 },
  survivor:         { minDeathRisk: 0.30,    requiredCount: 5 },
  lone_wolf:        { partySize: 1,          requiredCount: 3 },
  iron_will:        { maxCondition: 30,      requiredCount: 3 },
  beast_slayer:     { questType: 'monster',  requiredCount: 5 },
  shadow_walker:    { element: '암흑',       requiredCount: 5 },
}

/** 퀘스트 완료 후 questHistory 업데이트 */
export function updateQuestHistory(
  m: Mercenary,
  quest: Quest,
  partySize: number
): Mercenary {
  const history = { ...m.questHistory }
  const key = quest.questType as string
  history[quest.questType] = (history[quest.questType] ?? 0) + 1

  // beast_slayer: hunt도 monster 카운터에 포함
  if (quest.questType === 'hunt') {
    history['monster' as any] = ((history['monster' as any]) ?? 0) + 1
  }
  // 특수 카운터
  if (quest.deathRisk >= 0.30) {
    history['_highRisk' as any] = ((history['_highRisk' as any]) ?? 0) + 1
  }
  if (partySize === 1) {
    history['_solo' as any] = ((history['_solo' as any]) ?? 0) + 1
  }

  return { ...m, questHistory: history }
}

/** 새로 얻을 태그 목록 반환 */
export function checkNewTags(
  m: Mercenary,
  quest: Quest,
  partySize: number,
  condition: number
): SpecialtyTag[] {
  const newTags: SpecialtyTag[] = []
  const h = m.questHistory as Record<string, number>

  for (const [tag, cond] of Object.entries(TAG_CONDITIONS) as [SpecialtyTag, TagCondition][]) {
    if (m.specialtyTags.includes(tag)) continue
    let count = 0
    if (cond.questType) {
      count = h[cond.questType] ?? 0
    } else if (cond.minDeathRisk) {
      count = h['_highRisk'] ?? 0
    } else if (cond.partySize) {
      count = h['_solo'] ?? 0
    } else if (cond.maxCondition && condition <= cond.maxCondition) {
      count = (h['_lowCond'] ?? 0) + 1  // count this quest
    } else if (cond.element && quest.element === cond.element && m.element === cond.element) {
      count = h['_shadow'] ?? 0
    }
    if (count >= cond.requiredCount) newTags.push(tag)
  }
  return newTags
}

/** 태그에 따른 calcSuccessRate 보정값 */
export function tagSuccessBonus(m: Mercenary, quest: Quest, partySize: number): number {
  let bonus = 0
  for (const tag of m.specialtyTags) {
    switch (tag) {
      case 'dungeon_veteran': if (quest.questType === 'dungeon') bonus += 12; break
      case 'escort_expert':   if (quest.questType === 'escort')  bonus += 10; break
      case 'trap_specialist': if (quest.trapFocus) bonus += 8; break
      case 'beast_slayer':    if (quest.questType === 'monster' || quest.questType === 'hunt') bonus += 10; break
      case 'shadow_walker':   if (quest.element === '암흑' && m.element === '암흑') bonus += 5; break
      case 'lone_wolf':       if (partySize === 1) bonus += 15; break
    }
  }
  return bonus
}

/** 태그에 따른 사망위험 배율 */
export function tagDeathRiskMult(m: Mercenary, quest: Quest): number {
  let mult = 1.0
  for (const tag of m.specialtyTags) {
    switch (tag) {
      case 'dungeon_veteran': if (quest.questType === 'dungeon') mult *= 0.85; break
      case 'survivor': mult *= 0.80; break
      case 'iron_will': mult *= 0.85; break
    }
  }
  return mult
}
