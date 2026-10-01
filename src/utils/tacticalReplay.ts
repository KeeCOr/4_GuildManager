import type { ActiveQuest, Mercenary, Quest } from '../types'

export const TACTICAL_REPLAY_SPEEDS = [1, 2, 4] as const
export type TacticalReplaySpeed = typeof TACTICAL_REPLAY_SPEEDS[number]
export type TacticalReplayActor = { id: string; name: string; kind: 'ally' | 'enemy' | 'trap'; lane: number; x: number; hp: number }
export type TacticalReplayEvent = { id: string; at: number; title: string; detail: string; tone: 'move' | 'clash' | 'risk' | 'reward' }
export type TacticalReplayInsight = { id: 'power' | 'trap' | 'reward'; title: string; detail: string; tone: 'good' | 'warn' | 'neutral' }
export type TacticalReplay = { progress: number; phase: 'approach' | 'engage' | 'resolve'; actors: TacticalReplayActor[]; events: TacticalReplayEvent[]; insights: TacticalReplayInsight[] }
const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

function partyPower(party: Mercenary[]): number {
  return party.reduce((sum, merc) => sum + Math.max(0, Math.round(merc.power ?? 0)), 0)
}

function canHandleTrap(merc: Mercenary): boolean {
  return merc.class === '도적' || merc.class === '궁수' || (merc.trap_disarm ?? 0) >= 25
}

function buildReplayInsights(quest: Quest, party: Mercenary[]): TacticalReplayInsight[] {
  const totalPower = partyPower(party)
  const powerRatio = totalPower / Math.max(1, quest.difficulty)
  const trapReady = !quest.trapFocus || party.some(canHandleTrap)
  const powerTone: TacticalReplayInsight['tone'] = powerRatio >= 1 ? 'good' : 'warn'
  const powerDetail = powerRatio >= 1
    ? `권장 전력 충족: ${totalPower}/${quest.difficulty}`
    : `권장 전력 미달: ${totalPower}/${quest.difficulty}`
  const trapDetail = quest.trapFocus
    ? trapReady
      ? '함정 대응 인원이 있어 위험이 낮아집니다.'
      : '함정 대응 부재: 도적이나 궁수가 필요합니다.'
    : '함정 특화 의뢰가 아니어서 전열 판단이 중요합니다.'

  return [
    { id: 'power', title: powerTone === 'good' ? '전력 우위' : '전력 경고', detail: powerDetail, tone: powerTone },
    { id: 'trap', title: quest.trapFocus ? '함정 대응' : '전열 판단', detail: trapDetail, tone: trapReady ? 'good' : 'warn' },
    { id: 'reward', title: '보상 지점', detail: `${quest.reward.gold}G · 명성 ${quest.reward.fame} · 경험치 ${quest.reward.exp}`, tone: 'neutral' },
  ]
}

export function buildTacticalReplay(quest: Quest, party: Mercenary[], activeQuest: ActiveQuest, now: number): TacticalReplay {
  const startedAt = activeQuest.completesAt - activeQuest.durationMs
  const progress = clamp01((now - startedAt) / Math.max(1, activeQuest.durationMs))
  const phase: TacticalReplay['phase'] = progress < 0.35 ? 'approach' : progress < 0.82 ? 'engage' : 'resolve'
  const actors: TacticalReplayActor[] = party.map((merc, index) => ({ id: merc.id, name: merc.name, kind: 'ally', lane: index % 3, x: Math.min(78, 12 + progress * 58 + index * 3), hp: Math.max(12, merc.hp ?? 100) }))
  const enemyCount = Math.max(1, Math.min(3, Math.ceil(quest.difficulty / 220)))
  for (let i = 0; i < enemyCount; i += 1) actors.push({ id: 'enemy-' + quest.id + '-' + i, name: i === 0 ? '정예 적' : '졸개', kind: 'enemy', lane: i % 3, x: 84 - progress * 18, hp: Math.max(20, 85 - Math.round(progress * 50)) })
  if (quest.trapFocus) actors.push({ id: 'trap-' + quest.id, name: '함정', kind: 'trap', lane: 1, x: 48, hp: progress > 0.48 ? 0 : 100 })
  const allEvents: TacticalReplayEvent[] = [
    { id: 'move', at: 0.12, title: '진입', detail: `${party.length}명이 ${quest.name}에 들어갑니다.`, tone: 'move' },
    { id: 'scout', at: 0.32, title: '정찰', detail: quest.trapFocus ? '부대가 함정 흔적을 확인합니다.' : '전열이 적의 위치를 읽습니다.', tone: 'risk' },
    { id: 'clash', at: 0.58, title: '교전', detail: `난이도 ${quest.difficulty} 돌파를 시도합니다.`, tone: 'clash' },
    { id: 'reward', at: 0.88, title: '확보', detail: `${quest.reward.gold}G 보상 지점에 접근합니다.`, tone: 'reward' },
  ]
  return { progress, phase, actors, events: allEvents.filter(event => progress + 0.08 >= event.at), insights: buildReplayInsights(quest, party) }
}