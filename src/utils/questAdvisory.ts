import type { Mercenary, Quest } from '../types'
import { effPowerVs, canTrap, eqTrap, eqAtk, eqSurv } from './power'
import { elementRelation } from './elements'

export interface QuestRiskSummary {
  successRate: number
  totalDeathRisk: number
  deathRiskBand: 'safe' | 'caution' | 'danger' | 'reckless'
  highRiskMerc: { id: string; name: string; risk: number } | null
  expectedConditionDrain: number
  topFactors: string[]
  warning: string | null
}

export interface QuestCandidateRecommendation {
  merc: Mercenary
  score: number
  reasons: string[]
}

type DeathRiskCalculator = (quest: Quest, merc: Mercenary, party: Mercenary[]) => number

function riskBand(successRate: number, maxDeathRisk: number): QuestRiskSummary['deathRiskBand'] {
  if (successRate >= 75 && maxDeathRisk <= 0.12) return 'safe'
  if (successRate >= 55 && maxDeathRisk <= 0.22) return 'caution'
  if (successRate >= 35) return 'danger'
  return 'reckless'
}

function classFitReason(quest: Quest, merc: Mercenary): string | null {
  if (quest.trapFocus && canTrap(merc)) return '함정 대응'
  if (quest.deathRisk >= 0.12 && merc.class === '전사') return '전열 보호'
  if (quest.conditionDrain >= 18 && merc.class === '성직자') return '장기전 안정'
  if (merc.class === '마법사' && !quest.trapFocus) return '화력 보강'
  return null
}

export function createQuestRiskSummary(
  quest: Quest,
  assignedMercs: Mercenary[],
  successRate: number,
  calcDeathRisk: DeathRiskCalculator,
): QuestRiskSummary {
  if (assignedMercs.length === 0) {
    return {
      successRate: 0,
      totalDeathRisk: quest.deathRisk,
      deathRiskBand: 'reckless',
      highRiskMerc: null,
      expectedConditionDrain: 0,
      topFactors: ['용병 미배치', '전력 미확인'],
      warning: '용병을 배치해야 위험도를 계산할 수 있습니다.',
    }
  }

  const totalEff = assignedMercs.reduce((sum, merc) => sum + effPowerVs(merc, quest.element), 0)
  const powerRatio = totalEff / Math.max(1, quest.difficulty)
  const riskEntries = assignedMercs.map(merc => ({ merc, risk: calcDeathRisk(quest, merc, assignedMercs) }))
  const highRisk = riskEntries.reduce((worst, entry) => entry.risk > worst.risk ? entry : worst, riskEntries[0])
  const totalDeathRisk = 1 - riskEntries.reduce((aliveChance, entry) => aliveChance * (1 - entry.risk), 1)
  const averageCondition = assignedMercs.reduce((sum, merc) => sum + merc.condition, 0) / assignedMercs.length
  const averageMorale = assignedMercs.reduce((sum, merc) => sum + (merc.morale ?? 70), 0) / assignedMercs.length
  const classes = assignedMercs.map(merc => merc.class)
  const riskFactors: string[] = []

  if (powerRatio < 1) riskFactors.push(`전력 부족 ${Math.round(powerRatio * 100)}%`)
  if (quest.trapFocus && !assignedMercs.some(canTrap)) riskFactors.push('함정 대응 부재')
  if (quest.deathRisk >= 0.12 && !classes.includes('전사')) riskFactors.push('전열 보호 부재')
  if (quest.conditionDrain >= 18 && !classes.includes('성직자')) riskFactors.push('회복 지원 부재')
  if (assignedMercs.some(merc => elementRelation(merc.element, quest.element) === 'disadvantage')) riskFactors.push('속성 불리 포함')
  if (averageCondition < 55) riskFactors.push(`컨디션 낮음 ${Math.round(averageCondition)}`)
  if (averageMorale < 50) riskFactors.push(`사기 낮음 ${Math.round(averageMorale)}`)
  if (highRisk.risk >= 0.22) riskFactors.push(`${highRisk.merc.name} 사망위험 높음`)
  if (riskFactors.length === 0) riskFactors.push('위험 요인 낮음', '편성 안정')

  const warning = powerRatio < 1
    ? `권장 전력 미달: ${totalEff}/${quest.difficulty}`
    : highRisk.risk >= 0.3
      ? `${highRisk.merc.name} 사망위험 ${Math.round(highRisk.risk * 100)}%`
      : null

  return {
    successRate,
    totalDeathRisk,
    deathRiskBand: riskBand(successRate, highRisk.risk),
    highRiskMerc: { id: highRisk.merc.id, name: highRisk.merc.name, risk: highRisk.risk },
    expectedConditionDrain: Math.round(quest.conditionDrain * assignedMercs.length),
    topFactors: riskFactors.slice(0, 2),
    warning,
  }
}

export function recommendQuestCandidates(
  quest: Quest,
  mercs: Mercenary[],
  unavailableMercIds: ReadonlySet<string> = new Set<string>(),
  limit = 3,
): QuestCandidateRecommendation[] {
  return mercs
    .filter(merc => merc.status === '대기중' && !unavailableMercIds.has(merc.id) && merc.condition >= 10)
    .map(merc => {
      const relation = elementRelation(merc.element, quest.element)
      const reasons: string[] = []
      let score = effPowerVs(merc, quest.element)

      if (merc.element === quest.element) { score += 35; reasons.push('속성 일치') }
      else if (relation === 'advantage') { score += 24; reasons.push('속성 우위') }
      else if (relation === 'disadvantage') { score -= 12; reasons.push('속성 불리') }

      const classReason = classFitReason(quest, merc)
      if (classReason) { score += 20; reasons.push(classReason) }

      if (quest.trapFocus && canTrap(merc)) {
        score += 28 + Math.round((merc.trap_disarm + eqTrap(merc)) * 0.15)
        reasons.push(`함정 ${merc.trap_disarm + eqTrap(merc)}`)
      }
      if (quest.deathRisk >= 0.12) {
        score += Math.round((merc.stats.공격력 + eqAtk(merc)) * 0.18)
        reasons.push(`공격 ${merc.stats.공격력 + eqAtk(merc)}`)
      }
      if (quest.duration >= 3 || quest.conditionDrain >= 18) {
        score += Math.round((merc.stats.생존율 + eqSurv(merc)) * 0.22)
        reasons.push(`생존 ${merc.stats.생존율 + eqSurv(merc)}`)
      }

      score += Math.round(merc.condition * 0.18)
      if ((merc.morale ?? 70) >= 70) reasons.push('사기 양호')
      if (reasons.length === 0) reasons.push('기본 전력')

      return { merc, score, reasons: reasons.slice(0, 3) }
    })
    .sort((a, b) => b.score - a.score || a.merc.name.localeCompare(b.merc.name))
    .slice(0, limit)
}

export const QUEST_ADVISORY_LABEL = '추천 후보'
