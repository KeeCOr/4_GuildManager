import type { Mercenary } from '../types'
import { getEquipped, getSetBonuses } from '../data/equipment'
import { elementRelation } from './elements'
import { getMercPassiveStats } from '../data/passives'

/** Sum powerBonus (+ classBonus) from all equipped items */
const eqPow = (m: Mercenary): number =>
  getEquipped(m.equipment).reduce((s, e) =>
    s + e.powerBonus + (e.classBonus?.[m.class] ?? 0), 0)

const eqAtk  = (m: Mercenary): number => getEquipped(m.equipment).reduce((s, e) => s + e.atkBonus,  0)
const eqTrap = (m: Mercenary): number => getEquipped(m.equipment).reduce((s, e) => s + e.trapBonus, 0)
const eqSurv = (m: Mercenary): number => {
  const equipped = getEquipped(m.equipment)
  let surv = equipped.reduce((s, e) => s + e.survBonus, 0)
  // survival_bonus passives from items
  for (const e of equipped) {
    if (e.passive?.type === 'survival_bonus') surv += e.passive.value
  }
  // survival_bonus from set bonuses
  for (const { bonus } of getSetBonuses(equipped)) {
    for (const eff of bonus.effects) {
      if (eff.type === 'survival_bonus') surv += eff.value
    }
  }
  return surv
}

export const effPower = (m: Mercenary): number => {
  const favMod = 1 + (m.favorability - 50) / 500
  const passive = getMercPassiveStats(m.passives ?? [])
  const base = m.power + eqPow(m) + passive.powerBonus
  const moraleMod = 0.8 + 0.2 * ((m.morale ?? 70) / 100)
  return Math.round(base * (0.4 + 0.6 * m.condition / 100) * favMod * moraleMod)
}

/** effPower with element advantage/disadvantage applied vs a quest element */
export const effPowerVs = (m: Mercenary, questElement: string): number => {
  const base = effPower(m)
  const rel = elementRelation(m.element, questElement)
  if (rel === 'advantage')    return Math.round(base * 1.20)
  if (rel === 'disadvantage') return Math.round(base * 0.85)
  return base
}

export const combatPower = (m: Mercenary): number =>
  Math.round((m.stats.공격력 + eqAtk(m)) * (0.4 + 0.6 * m.condition / 100))

export const canTrap = (m: Mercenary): boolean =>
  m.class === '도적' || m.class === '궁수'

export const trapPower = (m: Mercenary): number =>
  m.trap_disarm + eqTrap(m)

export const survBonus = (m: Mercenary): number => eqSurv(m)

/** Total survival bonus including passives */
export const totalSurv = (m: Mercenary): number => {
  const passive = getMercPassiveStats(m.passives ?? [])
  return eqSurv(m) + passive.survBonus
}

/** Death risk multiplier from passives (e.g. -0.08 → 0.92) */
export const passiveDeathMod = (m: Mercenary): number => {
  const { deathRiskMod } = getMercPassiveStats(m.passives ?? [])
  return Math.max(0.1, 1 + deathRiskMod)
}

export { eqPow, eqAtk, eqTrap, eqSurv }
