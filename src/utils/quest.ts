import type { Mercenary, Quest } from '../types'
import { CLASS_TRAITS } from '../data/classTraits'
import { calcTraitDeathRiskMultiplier, calcTraitSuccessBonus } from '../data/combatTraits'
import { ALL_QUESTS } from '../data/quests'
import { GUILD_MAX_QUEST_DIFF, QUEST_BASE_TIMES_MIN } from '../constants'
import { effPower, effPowerVs, eqTrap, eqAtk, eqSurv, canTrap, passiveDeathMod } from './power'

import { elementRelation } from './elements'

export function computeGuildLevel(fame: number): number {
  const GUILD_LEVEL_FAME = [0, 30, 80, 180, 350] as const
  for (let i = GUILD_LEVEL_FAME.length - 1; i >= 0; i--) {
    if (fame >= GUILD_LEVEL_FAME[i]) return i + 1
  }
  return 1
}

/** Reputation lost when a contract is not cleared. Death costs are separate. */
export function calcQuestFailureFamePenalty(difficulty: number): number {
  const value = Math.max(0, difficulty)
  if (value <= 50) return 1
  if (value <= 100) return 2
  if (value <= 150) return 3
  if (value <= 200) return 4
  if (value <= 250) return 5
  if (value <= 300) return 6
  if (value <= 350) return 7
  if (value <= 400) return 8
  if (value <= 450) return 9
  if (value <= 500) return 10
  if (value <= 600) return 11
  return 12
}

/** A cleared quest may have casualties, but it can never end in a total party wipe. */
export function limitSuccessfulQuestDeaths(
  party: Array<{ id: string; deathRisk: number }>,
  rolledDeadIds: string[],
): string[] {
  const partyIds = new Set(party.map(member => member.id))
  const deadIds = [...new Set(rolledDeadIds)].filter(id => partyIds.has(id))
  if (party.length === 0 || deadIds.length < party.length) return deadIds

  const survivor = [...party].sort((a, b) => a.deathRisk - b.deathRisk || a.id.localeCompare(b.id))[0]
  return deadIds.filter(id => id !== survivor.id)
}

export function drawQuestPool(hallLevel: number, activeQuestIds: string[], fame: number): string[] {
  const count = [5, 7, 9, 12][Math.min(hallLevel - 1, 3)]
  const guildLv  = computeGuildLevel(fame)
  const maxDiff  = GUILD_MAX_QUEST_DIFF[Math.min(guildLv - 1, 4)]
  const nextDiff = guildLv < 5 ? GUILD_MAX_QUEST_DIFF[guildLv] : 9999
  const prevDiff = guildLv >= 2 ? GUILD_MAX_QUEST_DIFF[guildLv - 2] : 0

  const avail = ALL_QUESTS.filter(q => !activeQuestIds.includes(q.id))
  const currentTier = avail.filter(q => q.difficulty > prevDiff && q.difficulty <= maxDiff)
  const nextTier = avail
    .filter(q => q.difficulty > maxDiff && q.difficulty <= nextDiff)
    .filter(() => Math.random() < 0.20)
  const lowerTier = prevDiff > 0
    ? avail.filter(q => q.difficulty <= prevDiff).filter(() => Math.random() < 0.30)
    : []
  const candidates = [...currentTier, ...nextTier, ...lowerTier].sort(() => Math.random() - 0.5)
  return candidates.slice(0, count).map(q => q.id)
}

export function calcQuestDurationMs(quest: Quest, assignedMercs: Mercenary[]): number {
  const baseMins = QUEST_BASE_TIMES_MIN[Math.min(quest.duration - 1, 7)]
  const totalEff = assignedMercs.reduce((s, m) => s + effPowerVs(m, quest.element), 0)
  const powerRatio = totalEff / quest.difficulty
  let mult = 1.0
  if      (powerRatio >= 2.0) mult = 0.40
  else if (powerRatio >= 1.5) mult = 0.55
  else if (powerRatio >= 1.2) mult = 0.70
  else if (powerRatio >= 1.0) mult = 0.85
  return Math.max(5, Math.round(baseMins * mult)) * 60 * 1000
}

export function calcSuccessRate(quest: Quest, assignedIds: string[], allMercs: Mercenary[]): number {
  const assigned = assignedIds.filter(Boolean).map(id => allMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
  if (assigned.length === 0) return 0
  const totalEff = assigned.reduce((s, m) => s + effPowerVs(m, quest.element), 0)
  const powerRatio = totalEff / quest.difficulty
  let rate = Math.round(Math.min(95, powerRatio * 75 + 10))
  const classes = assigned.map(m => m.class)
  if (classes.includes('성직자')) rate = Math.min(95, rate + 8)
  if (classes.includes('전사'))   rate = Math.min(95, rate + 3)
  if (classes.includes('도적') && (quest.trapFocus || quest.conditionDrain >= 20)) rate = Math.min(95, rate + 10)
  rate += calcTraitSuccessBonus(quest, assigned)
  // 속성 상성 효과 (상성 이득 → 성공률 보정)
  for (const m of assigned) {
    const rel = elementRelation(m.element, quest.element)
    if (rel === 'advantage') rate = Math.min(95, rate + 10)
    else if (rel === 'disadvantage') rate = Math.max(5, rate - 5)
  }
  if (quest.trapFocus && quest.element === '암흑') {
    const darkMatch = assigned.filter(m => m.element === '암흑').length
    rate = Math.min(95, rate + darkMatch * 6)
  }
  if (quest.trapFocus) {
    const totalTrap = assigned.filter(m => canTrap(m)).reduce((s, m) => s + m.trap_disarm + eqTrap(m), 0)
    if (totalTrap >= 80) rate = Math.min(95, rate + 10)
    else if (totalTrap >= 50) rate = Math.min(95, rate + 5)
  }
  const fillRatio = assigned.length / quest.slots
  if (fillRatio < 0.5)       rate = Math.max(5, rate - 15)
  else if (fillRatio < 0.75) rate = Math.max(5, rate - 5)
  const avgCond = assigned.reduce((s, m) => s + m.condition, 0) / assigned.length
  if (avgCond < 50)      rate = Math.max(5, rate - 10)
  else if (avgCond < 70) rate = Math.max(5, rate - 5)
  return Math.max(5, Math.min(95, rate))
}

export function calcMercDeathRisk(quest: Quest, merc: Mercenary, party: Mercenary[]): number {
  let risk = quest.deathRisk
  const partySize = party.length
  const totalPartyEff = party.reduce((s, m) => s + effPowerVs(m, quest.element), 0)
  const powerRatio = totalPartyEff / quest.difficulty
  if      (powerRatio < 0.4)  risk *= 5.0
  else if (powerRatio < 0.6)  risk *= 3.0
  else if (powerRatio < 0.8)  risk *= 1.8
  else if (powerRatio < 0.95) risk *= 1.2
  else if (powerRatio >= 1.5) risk *= 0.6
  if (quest.trapFocus && canTrap(merc)) {
    // 도적/궁수는 함정 퀘스트에서 사망률 대폭 감소
    risk *= Math.max(0.2, 1.8 - (merc.trap_disarm + eqTrap(merc)) / 25)
  } else if (quest.conditionDrain >= 20 && canTrap(merc)) {
    risk *= Math.max(0.45, 1.5 - (merc.trap_disarm + eqTrap(merc)) / 40)
  }
  if (quest.deathRisk >= 0.12) {
    risk *= Math.max(0.55, 1.45 - (merc.stats.공격력 + eqAtk(merc)) / 55)
  }
  if (quest.duration >= 4) {
    risk *= Math.max(0.5, 1.35 - (merc.stats.생존율 + eqSurv(merc)) / 75)
  }
  risk *= Math.max(0.28, 1 - (merc.stats.생존율 + eqSurv(merc)) / 120)
  const partyClasses = party.map(m => m.class)
  if (partyClasses.includes('성직자')) risk *= 0.85
  if (quest.trapFocus && (partyClasses.includes('도적') || partyClasses.includes('궁수'))) risk *= 0.70
  if (partySize < 3) {
    const survNorm = merc.stats.생존율 / 100
    risk *= 1.0 + (1 - partySize / 3) * (1.2 - survNorm * 0.9)
  }
  const avgCoop = party.reduce((s, m) => s + m.traits.cooperation, 0) / partySize
  risk *= Math.max(0.72, 1.25 - avgCoop / 65)
  // 클래스별 고유 사망률 특성
  risk *= CLASS_TRAITS[merc.class].deathRiskMultiplier
  risk *= calcTraitDeathRiskMultiplier(quest, merc, party)
  if (partySize >= 2) {
    const partyAvgEff = totalPartyEff / partySize
    const relStrength = effPowerVs(merc, quest.element) / Math.max(1, partyAvgEff)
    risk *= Math.max(0.65, Math.min(2.4, Math.pow(1 / Math.max(0.1, relStrength), 0.75)))
  }
  // 속성 일치/상성 사망률 보정
  const rel = elementRelation(merc.element, quest.element)
  if (rel === 'match')             risk *= 0.50
  else if (rel === 'advantage')    risk *= 0.85
  else if (rel === 'disadvantage') risk *= 1.15
  // 패시브 사망률 보정
  risk *= passiveDeathMod(merc)
  return Math.min(0.98, Math.max(0.01, risk))
}
