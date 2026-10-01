import type { Mercenary, RoomId } from '../types'

export type RoomAgentSlot = {
  left: number
  top: number
  scale: number
  action: string
  animation: 'gm-agent-report' | 'gm-agent-training' | 'gm-agent-dining'
  wander: 'gm-agent-wander-a' | 'gm-agent-wander-b' | 'gm-agent-wander-c'
}

export type RoomAgentMerc = Pick<Mercenary, 'id' | 'room' | 'status'>

export type RoomAgent<TMerc extends RoomAgentMerc = Mercenary> = {
  merc: TMerc
  slot: RoomAgentSlot
  delay: number
  zIndex: number
  facing: 1 | -1
}

export const ROOM_AGENT_SLOTS: Record<RoomId, RoomAgentSlot[]> = {
  '길드마스터룸': [
    { left: 72, top: 28, scale: 0.74, action: '전략 보고', animation: 'gm-agent-report', wander: 'gm-agent-wander-a' },
    { left: 66, top: 35, scale: 0.70, action: '서류 정리', animation: 'gm-agent-report', wander: 'gm-agent-wander-b' },
    { left: 79, top: 37, scale: 0.72, action: '작전 검토', animation: 'gm-agent-report', wander: 'gm-agent-wander-c' },
    { left: 60, top: 30, scale: 0.68, action: '대기 순찰', animation: 'gm-agent-report', wander: 'gm-agent-wander-a' },
    { left: 84, top: 27, scale: 0.66, action: '명령 대기', animation: 'gm-agent-report', wander: 'gm-agent-wander-b' },
  ],
  '훈련소': [
    { left: 58, top: 55, scale: 0.78, action: '목검 훈련', animation: 'gm-agent-training', wander: 'gm-agent-wander-a' },
    { left: 70, top: 58, scale: 0.76, action: '표적 연습', animation: 'gm-agent-training', wander: 'gm-agent-wander-b' },
    { left: 82, top: 57, scale: 0.74, action: '무기 점검', animation: 'gm-agent-training', wander: 'gm-agent-wander-c' },
    { left: 64, top: 67, scale: 0.82, action: '체력 단련', animation: 'gm-agent-training', wander: 'gm-agent-wander-b' },
    { left: 77, top: 68, scale: 0.80, action: '자세 교정', animation: 'gm-agent-training', wander: 'gm-agent-wander-a' },
  ],
  '식당': [
    { left: 57, top: 81, scale: 0.84, action: '테이블 서빙', animation: 'gm-agent-dining', wander: 'gm-agent-wander-a' },
    { left: 68, top: 82, scale: 0.86, action: '식사 보조', animation: 'gm-agent-dining', wander: 'gm-agent-wander-b' },
    { left: 80, top: 80, scale: 0.82, action: '카운터 응대', animation: 'gm-agent-dining', wander: 'gm-agent-wander-c' },
    { left: 61, top: 91, scale: 0.90, action: '쟁반 운반', animation: 'gm-agent-dining', wander: 'gm-agent-wander-b' },
    { left: 74, top: 92, scale: 0.88, action: '손님 안내', animation: 'gm-agent-dining', wander: 'gm-agent-wander-a' },
    { left: 86, top: 90, scale: 0.86, action: '주방 왕복', animation: 'gm-agent-dining', wander: 'gm-agent-wander-c' },
  ],
}

export const hashString = (value: string): number => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
  return Math.abs(hash)
}

export const getRoomAgentSlot = <TMerc extends RoomAgentMerc>(merc: TMerc, roomMates: TMerc[]): RoomAgentSlot => {
  const slots = ROOM_AGENT_SLOTS[merc.room]
  const sortedIndex = [...roomMates].sort((a, b) => a.id.localeCompare(b.id)).findIndex(m => m.id === merc.id)
  const hash = hashString(merc.id)
  return slots[(Math.max(0, sortedIndex) + hash) % slots.length]
}

export const getRoomActionLabel = (slot: RoomAgentSlot): string => slot.action

export const deriveRoomAgents = <TMerc extends RoomAgentMerc>(
  mercs: TMerc[],
  pendingMercIds: ReadonlySet<string>
): RoomAgent<TMerc>[] => {
  const idleMercs = mercs.filter(merc => merc.status === '대기중' && !pendingMercIds.has(merc.id))
  return idleMercs.map((merc): RoomAgent<TMerc> => {
    const roomMates = idleMercs.filter(roomMerc => roomMerc.room === merc.room)
    const slot = getRoomAgentSlot(merc, roomMates)
    const hash = hashString(merc.id)
    return {
      merc,
      slot,
      delay: -((hash % 1600) / 1000),
      zIndex: 12 + Math.round(slot.top),
      facing: hash % 2 === 0 ? 1 : -1,
    }
  })
}
