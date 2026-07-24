import type { Quest, RoomFacilityState, RoomId, UpgradeResourceCost, UpgradeResourceId, UpgradeResourceState } from '../types'

export const UPGRADE_RESOURCE_DEFS: Record<UpgradeResourceId, { id: UpgradeResourceId; label: string; shortLabel: string; icon: string }> = {
  wood: { id: 'wood', label: '목재', shortLabel: '목재', icon: 'wood' },
  stone: { id: 'stone', label: '석재', shortLabel: '석재', icon: 'stone' },
  crest: { id: 'crest', label: '문장', shortLabel: '문장', icon: 'crest' },
}

const RESOURCE_IDS = Object.keys(UPGRADE_RESOURCE_DEFS) as UpgradeResourceId[]

export function createInitialUpgradeResources(): UpgradeResourceState {
  return { wood: 8, stone: 4, crest: 1 }
}

export function normalizeUpgradeResources(value: Partial<UpgradeResourceState> | undefined): UpgradeResourceState {
  const next = createInitialUpgradeResources()
  if (!value) return next
  for (const id of RESOURCE_IDS) next[id] = Math.max(0, Math.floor(value[id] ?? 0))
  return next
}

export function addUpgradeResources(current: UpgradeResourceState, reward: UpgradeResourceCost): UpgradeResourceState {
  const next = normalizeUpgradeResources(current)
  for (const id of RESOURCE_IDS) next[id] += Math.max(0, Math.floor(reward[id] ?? 0))
  return next
}

export function hasUpgradeResources(current: UpgradeResourceState, cost: UpgradeResourceCost): boolean {
  const normalized = normalizeUpgradeResources(current)
  return RESOURCE_IDS.every(id => normalized[id] >= Math.max(0, Math.floor(cost[id] ?? 0)))
}

export function spendUpgradeResources(current: UpgradeResourceState, cost: UpgradeResourceCost): UpgradeResourceState {
  const normalized = normalizeUpgradeResources(current)
  if (!hasUpgradeResources(normalized, cost)) return normalized
  const next = { ...normalized }
  for (const id of RESOURCE_IDS) next[id] -= Math.max(0, Math.floor(cost[id] ?? 0))
  return next
}

export function formatUpgradeResourceCost(cost: UpgradeResourceCost): string {
  const parts = RESOURCE_IDS
    .map(id => ({ id, amount: Math.max(0, Math.floor(cost[id] ?? 0)) }))
    .filter(item => item.amount > 0)
    .map(item => `${UPGRADE_RESOURCE_DEFS[item.id].shortLabel} ${item.amount}`)
  return parts.length > 0 ? parts.join(' / ') : '재료 없음'
}

export function missingUpgradeResourceLabels(current: UpgradeResourceState, cost: UpgradeResourceCost): string[] {
  const normalized = normalizeUpgradeResources(current)
  return RESOURCE_IDS
    .filter(id => normalized[id] < Math.max(0, Math.floor(cost[id] ?? 0)))
    .map(id => `${UPGRADE_RESOURCE_DEFS[id].shortLabel} ${normalized[id]} / ${Math.max(0, Math.floor(cost[id] ?? 0))}`)
}

export function roomFacilityResourceCost(room: RoomId, facilityId: string, roomLevels: Record<string, number>, facilities: RoomFacilityState): UpgradeResourceCost {
  const current = Math.max(0, Math.floor(facilities[room]?.[facilityId] ?? 0))
  const targetLevel = Math.max(1, Math.min(3, roomLevels[room] ?? 1))
  const next = Math.min(targetLevel, current + 1)
  if (current >= targetLevel) return {}
  if (room === '길드마스터룸') return { wood: next, stone: targetLevel + next, crest: targetLevel >= 2 ? 1 : 0 }
  if (room === '훈련소') return { wood: targetLevel + next + 1, stone: next, crest: targetLevel >= 3 ? 1 : 0 }
  return { wood: next + 1, stone: targetLevel, crest: targetLevel >= 3 ? 1 : 0 }
}

export function questUpgradeResourceReward(quest: Quest): UpgradeResourceCost {
  const difficulty = Math.max(1, quest.difficulty)
  const wood = Math.max(1, Math.floor(difficulty / 45))
  const stone = Math.max(0, Math.floor((difficulty - 25) / 70)) + (quest.trapFocus ? 1 : 0)
  const crest = difficulty >= 95 ? 1 + Math.floor((difficulty - 95) / 140) : 0
  return { wood, stone, crest }
}

export function getDominantUpgradeResource(cost: UpgradeResourceCost): UpgradeResourceId {
  let best: UpgradeResourceId = 'wood'
  let bestAmount = -1
  for (const id of RESOURCE_IDS) {
    const amount = Math.max(0, Math.floor(cost[id] ?? 0))
    if (amount > bestAmount) {
      best = id
      bestAmount = amount
    }
  }
  return best
}

export function upgradeResourceRewardChips(cost: UpgradeResourceCost): Array<{ id: UpgradeResourceId; label: string; amount: number }> {
  return RESOURCE_IDS
    .map(id => ({ id, label: UPGRADE_RESOURCE_DEFS[id].shortLabel, amount: Math.max(0, Math.floor(cost[id] ?? 0)) }))
    .filter(item => item.amount > 0)
}
