import type { Mercenary, Quest } from '../types'
import { ALL_QUESTS } from '../data/quests'
import { GUILD_MAX_QUEST_DIFF, QUEST_BASE_TIMES_MIN } from '../constants'
import { effPower, wTrap, wAtk, wSurv, canTrap } from './power'

export function computeGuildLevel(fame: number): number {
  const GUILD_LEVEL_FAME = [0, 30, 80, 180, 350] as const
  for (let i = GUILD_LEVEL_FAME.length - 1; i >= 0; i--) {
    if (fame >= GUILD_LEVEL_FAME[i]) return i + 1
  }
  return 1
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
  const totalEff = assignedMercs.reduce((s, m) => s + effPower(m), 0)
  const powerRatio = totalEff / quest.difficulty
  let mult = 1.0
  if      (powerRatio >= 2.0) mult = 0.40
  else if (powerRatio >= 1.5) mult = 0.55
  else if (powerRatio >= 1.2) mult = 0.70
  else if (powerRatio >= 1.0) mult = 0.85
  if (quest.element === '번개') {
    const cnt = assignedMercs.filter(m => m.element === '번개').length
    if (cnt > 0) mult *= Math.max(0.6, 1 - cnt * 0.12)
  }
  return Math.max(5, Math.round(baseMins * mult)) * 60 * 1000
}

export function calcSuccessRate(quest: Quest, assignedIds: string[], allMercs: Mercenary[]): number {
  const assigned = assignedIds.filter(Boolean).map(id => allMercs.find(m => m.id === id)).filter(Boolean) as Mercenary[]
  if (assigned.length === 0) return 0
  const totalEff = assigned.reduce((s, m) => s + effPower(m), 0)
  const powerRatio = totalEff / quest.difficulty
  let rate = Math.round(Math.min(95, powerRatio * 75 + 10))
  const classes = assigned.map(m => m.class)
  if (classes.includes('성직자')) rate = Math.min(95, rate + 8)
  if (classes.includes('전사'))   rate = Math.min(95, rate + 3)
  if (classes.includes('도적') && (quest.trapFocus || quest.conditionDrain >= 20)) rate = Math.min(95, rate + 10)
  for (const m of assigned.filter(m => m.element === quest.element)) {
    switch (m.element) {
      case '불':   rate = Math.min(95, rate + 13); break
      case '얼음': rate = Math.min(95, rate + 8);  break
      case '번개': rate = Math.min(95, rate + 9);  break
      case '자연': rate = Math.min(95, rate + 10); break
      case '암흑': rate = Math.min(95, rate + 11); break
      case '빛':   rate = Math.min(95, rate + 14); break
    }
  }
  if (quest.trapFocus && quest.element === '암흑') {
    const darkMatch = assigned.filter(m => m.element === '암흑').length
    rate = Math.min(95, rate + darkMatch * 8)
  }
  if (quest.trapFocus) {
    const totalTrap = assigned.filter(m => canTrap(m)).reduce((s, m) => s + m.trap_disarm + wTrap(m), 0)
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
  const totalPartyEff = party.reduce((s, m) => s + effPower(m), 0)
  const powerRatio = totalPartyEff / quest.difficulty
  if      (powerRatio < 0.4)  risk *= 5.0
  else if (powerRatio < 0.6)  risk *= 3.0
  else if (powerRatio < 0.8)  risk *= 1.8
  else if (powerRatio < 0.95) risk *= 1.2
  else if (powerRatio >= 1.5) risk *= 0.6
  if (quest.conditionDrain >= 20 && canTrap(merc)) {
    risk *= Math.max(0.5, 1.6 - (merc.trap_disarm + wTrap(merc)) / 35)
  }
  if (quest.deathRisk >= 0.12) {
    risk *= Math.max(0.55, 1.45 - (merc.stats.공격력 + wAtk(merc)) / 55)
  }
  if (quest.duration >= 4) {
    risk *= Math.max(0.5, 1.35 - (merc.stats.생존율 + wSurv(merc)) / 75)
  }
  risk *= Math.max(0.28, 1 - (merc.stats.생존율 + wSurv(merc)) / 120)
  const partyClasses = party.map(m => m.class)
  if (partyClasses.includes('성직자')) risk *= 0.65
  if (partyClasses.includes('전사') && merc.class !== '전사') risk *= 0.82
  if (partyClasses.includes('도적') && quest.conditionDrain >= 20) risk *= 0.78
  if (partySize < 3) {
    const survNorm = merc.stats.생존율 / 100
    risk *= 1.0 + (1 - partySize / 3) * (1.2 - survNorm * 0.9)
  }
  const avgCoop = party.reduce((s, m) => s + m.traits.cooperation, 0) / partySize
  risk *= Math.max(0.72, 1.25 - avgCoop / 65)
  if (merc.class === '마법사' && quest.deathRisk < 0.12 && !partyClasses.includes('성직자')) risk *= 1.18
  if (merc.class === '성직자') risk *= 0.72
  if (merc.class === '전사')   risk *= 0.88
  if (partySize >= 2) {
    const partyAvgEff = totalPartyEff / partySize
    const relStrength = effPower(merc) / Math.max(1, partyAvgEff)
    risk *= Math.max(0.65, Math.min(2.4, Math.pow(1 / Math.max(0.1, relStrength), 0.75)))
  }
  if (merc.element === '자연' && quest.element === '자연') risk *= 0.65
  const lightMatchCount = party.filter(m => m.element === '빛' && quest.element === '빛').length
  if (lightMatchCount > 0) risk *= Math.pow(0.72, lightMatchCount)
  return Math.min(0.98, Math.max(0.01, risk))
}
