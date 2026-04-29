// src/utils/retirement.ts
import type { Mercenary } from '../types'

/** 나이 경계 시 은퇴 확률 계산. age < 40: 0% */
export function calcRetirementChance(m: Mercenary, currentMorale: number): number {
  if (m.age < 40) return 0
  const baseChance = Math.min(0.45, (m.age - 40) * 0.03)
  const moralePenalty = (m.age >= 35 && m.favorability < 20) ? 0.20 : 0
  const loyaltyMod = m.traits.loyalty > 70 ? 0.5 : 1.0
  return Math.min(0.85, (baseChance + moralePenalty) * loyaltyMod)
}

/** 레벨업 시 나이별 성장 배율 */
export function growthMultiplier(age: number): number {
  if (age < 30) return 1.0
  if (age < 40) return 0.8
  return 0.5
}

/** 이탈 조건 판정 (호감도 임계치) */
export function getDefectionThreshold(loyalty: number): number {
  if (loyalty >= 70) return 15
  if (loyalty >= 40) return 25
  return 35
}
