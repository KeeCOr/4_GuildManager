export type QuestPerformance = 'noteworthy' | 'remarkable' | 'legendary'

export interface SpecialBonusOffer {
  id: string
  questId: string
  questName: string
  participantIds: string[]
  performance: QuestPerformance
  performanceLabel: string
  reasons: string[]
  cost: number
  loyaltyGain: number
  moraleGain: number
  conditionRecovery: number
  withheldLoyaltyLoss: number
  withheldMoraleLoss: number
  withheldConditionLoss: number
}

export const MANUAL_BONUS_TIERS = [
  { id: 'encourage', label: '격려금', cost: 30, loyalty: 2, morale: 4, condition: 4 },
  { id: 'merit', label: '공로금', cost: 80, loyalty: 5, morale: 8, condition: 10 },
  { id: 'devotion', label: '충성 보너스', cost: 150, loyalty: 10, morale: 15, condition: 20 },
] as const

export function createSpecialBonusOffer(input: {
  questId: string; questName: string; rewardGold: number; conditionDrain: number
  participantIds: string[]; notableReasons: string[]
}): SpecialBonusOffer {
  const score = Math.max(1, Math.min(3, input.notableReasons.length))
  const performance: QuestPerformance = score === 3 ? 'legendary' : score === 2 ? 'remarkable' : 'noteworthy'
  const labels = { noteworthy: '주목할 성과', remarkable: '탁월한 성과', legendary: '전설적인 성과' }
  return {
    id: `${input.questId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    questId: input.questId, questName: input.questName,
    participantIds: [...new Set(input.participantIds)], performance, performanceLabel: labels[performance],
    reasons: [...input.notableReasons],
    cost: Math.max(20, Math.round(input.rewardGold * (0.12 + score * 0.06))),
    loyaltyGain: 4 + score * 3, moraleGain: 5 + score * 3,
    conditionRecovery: Math.max(6 + score * 3, Math.round(input.conditionDrain * (0.35 + score * 0.15))),
    withheldLoyaltyLoss: 1 + score * 2, withheldMoraleLoss: 2 + score * 2, withheldConditionLoss: 1 + score,
  }
}

export function applySpecialBonusStats(current: { loyalty?: number; morale?: number; condition: number }, offer: SpecialBonusOffer, paid: boolean) {
  return paid ? {
    loyalty: Math.min(100, (current.loyalty ?? 50) + offer.loyaltyGain),
    morale: Math.min(100, (current.morale ?? 70) + offer.moraleGain),
    condition: Math.min(100, current.condition + offer.conditionRecovery),
  } : {
    loyalty: Math.max(0, (current.loyalty ?? 50) - offer.withheldLoyaltyLoss),
    morale: Math.max(0, (current.morale ?? 70) - offer.withheldMoraleLoss),
    condition: Math.max(0, current.condition - offer.withheldConditionLoss),
  }
}
