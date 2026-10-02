import type { Mercenary, Quest } from '../types'
import { canTrap, effPowerVs } from './power'
import { elementRelation } from './elements'

export type ReadinessStatus = 'met' | 'partial' | 'unmet'

export interface QuestReadinessRow {
  id: 'power' | 'trap' | 'role' | 'element'
  label: string
  requirement: string
  current: string
  status: ReadinessStatus
}

export interface QuestReadinessComparison {
  rows: QuestReadinessRow[]
  metCount: number
  totalCount: number
  actionHint: string
}

export function getQuestReadinessComparison(quest: Quest, party: Mercenary[]): QuestReadinessComparison {
  const totalPower = party.reduce((sum, merc) => sum + effPowerVs(merc, quest.element), 0)
  const powerRatio = totalPower / Math.max(1, quest.difficulty)
  const trapCount = party.filter(canTrap).length
  const matchingElements = party.filter(merc => {
    const relation = elementRelation(merc.element, quest.element)
    return merc.element === quest.element || relation === 'advantage'
  }).length

  const requiredRole = quest.deathRisk >= 0.12
    ? { name: '전사', hint: '전사를 배치해 전열을 보강하세요' }
    : quest.conditionDrain >= 18
      ? { name: '성직자', hint: '성직자를 배치해 장기전 회복을 보강하세요' }
      : null
  const roleCount = requiredRole ? party.filter(merc => merc.class === requiredRole.name).length : party.length

  const rows: QuestReadinessRow[] = [
    {
      id: 'power',
      label: '전력',
      requirement: `${quest.difficulty} 이상`,
      current: party.length > 0 ? `${totalPower}` : '미편성',
      status: powerRatio >= 1 ? 'met' : powerRatio >= 0.65 ? 'partial' : 'unmet',
    },
    {
      id: 'trap',
      label: '함정 대응',
      requirement: quest.trapFocus ? '도적·궁수 1명' : '요구 없음',
      current: quest.trapFocus ? `${trapCount}명` : '해당 없음',
      status: !quest.trapFocus || trapCount > 0 ? 'met' : 'unmet',
    },
    {
      id: 'role',
      label: '핵심 역할',
      requirement: requiredRole ? `${requiredRole.name} 1명` : '자유 편성',
      current: requiredRole ? `${roleCount}명` : party.length > 0 ? '충족' : '미편성',
      status: requiredRole ? (roleCount > 0 ? 'met' : 'unmet') : (party.length > 0 ? 'met' : 'partial'),
    },
    {
      id: 'element',
      label: '속성 대응',
      requirement: '유리·일치 1명',
      current: `${matchingElements}명`,
      status: matchingElements > 0 ? 'met' : party.length > 0 ? 'partial' : 'unmet',
    },
  ]

  const hintById: Record<QuestReadinessRow['id'], string> = {
    power: `전력을 ${Math.max(0, quest.difficulty - totalPower)} 더 보강하세요`,
    trap: '도적 또는 궁수를 배치하세요',
    role: requiredRole?.hint ?? '용병을 한 명 이상 배치하세요',
    element: '유리하거나 같은 속성의 용병을 배치하세요',
  }
  const firstGap = rows.find(row => row.status === 'unmet') ?? rows.find(row => row.status === 'partial')

  return {
    rows,
    metCount: rows.filter(row => row.status === 'met').length,
    totalCount: rows.length,
    actionHint: firstGap ? hintById[firstGap.id] : '핵심 출정 조건을 모두 충족했습니다',
  }
}
