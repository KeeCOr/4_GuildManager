import type {
  ActiveQuest,
  Mercenary,
  MercenaryStatus,
  ReturnActivityFeedback,
  ReturnActivityId,
  ReturnEpisode,
  ReturnEpisodeChoice,
  ReturnEpisodeState,
  ReturnParticipantSnapshot,
  RoomId,
} from '../types'

const EXP_TO_NEXT = (level: number): number => level * 100

const PROCESSED_ID_LIMIT = 200
const REVIEW_XP_GAIN = 45
const REVIEW_MAX_LEVEL = 50

const CHOICE_DEFS: ReturnEpisodeChoice[] = [
  { id: 'feast', label: '축하 연회', description: '생존한 대원 전원의 사기 +8, 호감도 +4' },
  { id: 'review', label: '작전 복기', description: '생존한 대원 전원의 경험치 +45' },
  { id: 'care', label: '치료와 휴식', description: '생존한 대원 전원의 HP +35, 컨디션 +20' },
]

const ACTIVITY_ROOMS: Record<ReturnActivityId, RoomId> = {
  feast: '식당',
  review: '훈련소',
  care: '길드마스터룸',
}

const ACTIVITY_LABELS: Record<ReturnActivityId, { actionLabel: string; rewardLabel: string }> = {
  feast: { actionLabel: '축하 연회', rewardLabel: '사기 +8 · 호감도 +4' },
  review: { actionLabel: '작전 복기', rewardLabel: '경험치 +45' },
  care: { actionLabel: '치료와 휴식', rewardLabel: 'HP +35 · 컨디션 +20' },
}

const dedupeBounded = (ids: readonly string[], max: number): string[] => {
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    deduped.push(id)
  }
  return deduped.length > max ? deduped.slice(deduped.length - max) : deduped
}

const pickDeterministic = <T extends { id: string }>(
  list: readonly T[],
  compare: (a: T, b: T) => number
): T | undefined => [...list].sort((a, b) => compare(a, b) || a.id.localeCompare(b.id))[0]

const deriveCause = (success: boolean, participants: readonly Mercenary[], survivors: readonly Mercenary[]): string => {
  if (success) {
    const hero = pickDeterministic(survivors.length > 0 ? survivors : participants, (a, b) => b.power - a.power)
    return hero ? `${hero.name}의 활약으로 임무를 성공적으로 마쳤다.` : '임무를 성공적으로 마쳤다.'
  }
  const wounded = pickDeterministic(survivors, (a, b) => (a.hp - b.hp) || (a.condition - b.condition))
  if (wounded) return `${wounded.name}의 부상으로 임무는 실패로 끝났다.`
  const fallen = pickDeterministic(participants, (a, b) => b.power - a.power)
  return fallen ? `${fallen.name}의 희생에도 임무는 실패로 끝났다.` : '임무는 실패로 끝났다.'
}

export const generateReturnEpisode = (
  activeQuest: ActiveQuest,
  questName: string,
  success: boolean,
  postMercs: readonly Mercenary[]
): ReturnEpisode => {
  const participantMercs = activeQuest.assignedMercIds
    .map(id => postMercs.find(m => m.id === id))
    .filter((m): m is Mercenary => m !== undefined)
  const survivors = participantMercs.filter(m => m.status !== '영혼')

  const participants: ReturnParticipantSnapshot[] = participantMercs.map(m => ({
    id: m.id,
    name: m.name,
    status: m.status,
  }))

  return {
    id: `${activeQuest.questId}:${activeQuest.completesAt}`,
    questId: activeQuest.questId,
    completesAt: activeQuest.completesAt,
    questName,
    success,
    cause: deriveCause(success, participantMercs, survivors),
    participants,
    choices: CHOICE_DEFS.map(choice => ({ ...choice })),
  }
}

export const enqueueReturnEpisode = (
  state: ReturnEpisodeState,
  episode: ReturnEpisode
): ReturnEpisodeState => {
  if (state.processedIds.includes(episode.id)) return state
  if (state.pending.some(pending => pending.id === episode.id)) return state
  return { ...state, pending: [...state.pending, episode] }
}

const applyFeast = (m: Mercenary): Mercenary => ({
  ...m,
  morale: Math.min(100, m.morale + 8),
  favorability: Math.min(100, m.favorability + 4),
  room: ACTIVITY_ROOMS.feast,
})

const applyReview = (m: Mercenary): Mercenary => {
  let exp = m.experience + REVIEW_XP_GAIN
  let level = m.level
  let expToNext = m.expToNext
  while (exp >= expToNext && level < REVIEW_MAX_LEVEL) {
    exp -= expToNext
    level += 1
    expToNext = EXP_TO_NEXT(level)
  }
  const gained = level - m.level
  if (gained <= 0) {
    return { ...m, experience: exp, expToNext, room: ACTIVITY_ROOMS.review }
  }
  return {
    ...m,
    level,
    experience: exp,
    expToNext,
    room: ACTIVITY_ROOMS.review,
    power: m.power + gained * 2,
    trap_disarm: m.trap_disarm + gained,
    stats: {
      공격력: m.stats.공격력 + gained,
      함정해제: m.stats.함정해제 + gained,
      생존율: m.stats.생존율 + gained,
      협조성: m.stats.협조성 + gained,
    },
  }
}

const applyCare = (m: Mercenary): Mercenary => {
  const recoveredStatus: MercenaryStatus = m.status === '부상' ? '대기중' : m.status
  return {
    ...m,
    hp: Math.min(100, m.hp + 35),
    condition: Math.min(100, m.condition + 20),
    status: recoveredStatus,
    room: ACTIVITY_ROOMS.care,
  }
}

const ACTIVITY_APPLIERS: Record<ReturnActivityId, (m: Mercenary) => Mercenary> = {
  feast: applyFeast,
  review: applyReview,
  care: applyCare,
}

const buildFeedback = (activityId: ReturnActivityId, participantIds: string[]): ReturnActivityFeedback => {
  const { actionLabel, rewardLabel } = ACTIVITY_LABELS[activityId]
  return {
    activityId,
    participantIds,
    visualRoom: ACTIVITY_ROOMS[activityId],
    ...(activityId === 'care' ? { visualAnchor: 'infirmary' as const } : {}),
    actionLabel,
    rewardLabel,
  }
}

export interface ResolveReturnEpisodeResult {
  mercs: Mercenary[]
  state: ReturnEpisodeState
  applied: boolean
}

export const resolveReturnEpisode = (
  state: ReturnEpisodeState,
  episodeId: string,
  activityId: ReturnActivityId,
  mercs: Mercenary[]
): ResolveReturnEpisodeResult => {
  if (state.processedIds.includes(episodeId)) {
    return { mercs, state, applied: false }
  }
  const episode = state.pending.find(pending => pending.id === episodeId)
  if (!episode) {
    return { mercs, state, applied: false }
  }

  const participantIds = new Set(episode.participants.map(p => p.id))
  const applyToMerc = ACTIVITY_APPLIERS[activityId]
  const affectedIds: string[] = []
  const nextMercs = mercs.map(m => {
    if (!participantIds.has(m.id) || m.status === '영혼') return m
    affectedIds.push(m.id)
    return applyToMerc(m)
  })

  const nextPending = state.pending.filter(pending => pending.id !== episodeId)
  const nextProcessed = dedupeBounded([...state.processedIds, episodeId], PROCESSED_ID_LIMIT)

  return {
    mercs: nextMercs,
    state: {
      pending: nextPending,
      processedIds: nextProcessed,
      activeFeedback: buildFeedback(activityId, affectedIds),
    },
    applied: true,
  }
}

export const createDefaultReturnEpisodeState = (): ReturnEpisodeState => ({
  pending: [],
  processedIds: [],
  activeFeedback: null,
})

const isReturnActivityId = (value: unknown): value is ReturnActivityId =>
  value === 'feast' || value === 'review' || value === 'care'

const isRoomId = (value: unknown): value is RoomId =>
  value === '훈련소' || value === '길드마스터룸' || value === '식당'

const isParticipantSnapshot = (value: unknown): value is ReturnParticipantSnapshot => {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.name === 'string' && typeof v.status === 'string'
}

const isChoice = (value: unknown): value is ReturnEpisodeChoice => {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return isReturnActivityId(v.id) && typeof v.label === 'string' && typeof v.description === 'string'
}

const isEpisode = (value: unknown): value is ReturnEpisode => {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.questId === 'string' &&
    typeof v.completesAt === 'number' &&
    typeof v.questName === 'string' &&
    typeof v.success === 'boolean' &&
    typeof v.cause === 'string' &&
    Array.isArray(v.participants) && v.participants.every(isParticipantSnapshot) &&
    Array.isArray(v.choices) && v.choices.every(isChoice)
  )
}

const isFeedback = (value: unknown): value is ReturnActivityFeedback => {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    isReturnActivityId(v.activityId) &&
    Array.isArray(v.participantIds) && v.participantIds.every(id => typeof id === 'string') &&
    isRoomId(v.visualRoom) &&
    typeof v.actionLabel === 'string' &&
    typeof v.rewardLabel === 'string' &&
    (v.visualAnchor === undefined || v.visualAnchor === 'infirmary')
  )
}

export const normalizeReturnEpisodeState = (input: unknown): ReturnEpisodeState => {
  const raw = (input && typeof input === 'object') ? input as Record<string, unknown> : {}

  const pendingRaw = Array.isArray(raw.pending) ? raw.pending : []
  const pendingCandidates = pendingRaw.filter(isEpisode)

  const processedRaw = Array.isArray(raw.processedIds) ? raw.processedIds : []
  const processedIds = dedupeBounded(
    processedRaw.filter((id): id is string => typeof id === 'string'),
    PROCESSED_ID_LIMIT
  )

  const processedIdSet = new Set(processedIds)
  const seenPendingIds = new Set<string>()
  const pending: ReturnEpisode[] = []
  for (const episode of pendingCandidates) {
    if (processedIdSet.has(episode.id) || seenPendingIds.has(episode.id)) continue
    seenPendingIds.add(episode.id)
    pending.push(episode)
  }

  const activeFeedback = isFeedback(raw.activeFeedback) ? raw.activeFeedback : null

  return { pending, processedIds, activeFeedback }
}
