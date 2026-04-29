import { URGENT_QUEST_FAME_THRESHOLD, URGENT_QUEST_MISS_FAME_PENALTY, URGENT_QUEST_EXPIRY_DAYS } from '../constants'
import { ALL_QUESTS } from '../data/quests'

export const GAME_DAY_MS = 5 * 60 * 1000

export function gradeWeightsByFame(fame: number): Record<string, number> {
  if (fame < 30) {
    return { D: 1.5, C: 1.0, B: 0.5, A: 0.2, S: 0.1 }
  } else if (fame < 80) {
    return { D: 1.0, C: 1.0, B: 1.0, A: 1.0, S: 1.0 }
  } else if (fame < 180) {
    return { D: 0.7, C: 1.0, B: 1.2, A: 1.3, S: 0.8 }
  } else {
    return { D: 0.4, C: 0.8, B: 1.2, A: 1.5, S: 1.2 }
  }
}

export function pickUrgentQuestCandidates(
  fame: number,
  completedQuestIds: string[],
  currentUrgentIds: string[]
): string[] {
  if (fame < URGENT_QUEST_FAME_THRESHOLD) return []
  return ALL_QUESTS
    .filter(q => q.isUrgentEligible)
    .filter(q => !completedQuestIds.includes(q.id))
    .filter(q => !currentUrgentIds.includes(q.id))
    .map(q => q.id)
}

export function urgentExpiryMs(currentMs: number): number {
  return currentMs + URGENT_QUEST_EXPIRY_DAYS * GAME_DAY_MS
}

