import type { Mercenary, Quest, QuestReport } from '../types'
import { effPower } from './power'

export function generateQuestReport(
  quest: Quest,
  assignedMercs: Mercenary[],
  success: boolean,
  deadIds: string[]
): QuestReport {
  const survivors = assignedMercs.filter(m => !deadIds.includes(m.id))
  if (survivors.length === 0) {
    return { questId: quest.id, questName: quest.name, success, mercPerformance: {}, bonusApplied: false, timestamp: Date.now() }
  }
  const powers = survivors.map(m => ({ id: m.id, power: effPower(m) }))
  const avg = powers.reduce((s, p) => s + p.power, 0) / powers.length
  const mvp = powers.reduce((a, b) => a.power > b.power ? a : b)
  const poor = powers.reduce((a, b) => a.power < b.power ? a : b)
  const performance: Record<string, 'excellent' | 'normal' | 'poor'> = {}
  for (const { id, power } of powers) {
    performance[id] = power >= avg * 1.3 ? 'excellent' : power <= avg * 0.7 ? 'poor' : 'normal'
  }
  return {
    questId: quest.id,
    questName: quest.name,
    success,
    mvpId: survivors.length > 1 ? mvp.id : undefined,
    poorPerformerId: survivors.length > 1 && poor.id !== mvp.id ? poor.id : undefined,
    mercPerformance: performance,
    bonusApplied: false,
    timestamp: Date.now(),
  }
}
