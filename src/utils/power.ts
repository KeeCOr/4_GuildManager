import type { Mercenary, Weapon } from '../types'
import { WEAPONS } from '../data/weapons'

export const weaponOf = (m: Mercenary): Weapon =>
  WEAPONS.find(w => w.id === m.weaponId) ??
  WEAPONS.find(w => w.class === m.class && w.tier === 1)!

export const wPow  = (m: Mercenary) => { const w = weaponOf(m); return w.powerBonus + (w.raceBonus[m.race] ?? 0) }
export const wAtk  = (m: Mercenary) => weaponOf(m).atkBonus
export const wTrap = (m: Mercenary) => weaponOf(m).trapBonus
export const wSurv = (m: Mercenary) => weaponOf(m).survBonus

export const effPower = (m: Mercenary): number => {
  const favMod = 1 + (m.favorability - 50) / 500
  const ageMult = m.age >= 55 ? 0
    : m.age >= 38 ? 1 - (m.age - 38) / 34 * 0.5
    : 1
  const burnoutMult = (m.consecutiveDispatches ?? 0) >= 3 ? 0.85 : 1
  const atkBuff = m.specialtyBonuses?.atkBonus ?? 0
  return Math.round(
    (m.power + wPow(m) + atkBuff)
    * (0.4 + 0.6 * m.condition / 100)
    * favMod * ageMult * burnoutMult
  )
}

export const combatPower = (m: Mercenary): number =>
  Math.round((m.stats.공격력 + wAtk(m)) * (0.4 + 0.6 * m.condition / 100))

export const canTrap = (m: Mercenary): boolean =>
  m.class === '도적' || m.class === '궁수'
