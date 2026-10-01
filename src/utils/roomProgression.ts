import type { RoomFacilityState, RoomId, UpgradeResourceCost } from '../types'
import { roomFacilityResourceCost } from './upgradeResources'

export type RoomFacilityDef = { id: string; name: string; desc: string; baseCost: number }
export type RoomFacilityRow = RoomFacilityDef & { level: number; targetLevel: number; completeForTier: boolean; canUpgrade: boolean; cost: number; resourceCost: UpgradeResourceCost }

export const ROOM_FACILITY_DEFS: Record<RoomId, RoomFacilityDef[]> = {
  '길드마스터룸': [
    { id: 'commandDesk', name: 'Command Desk', desc: 'Affinity management', baseCost: 120 },
    { id: 'strategyMap', name: 'Strategy Map', desc: 'Dispatch planning', baseCost: 140 },
    { id: 'soulArchive', name: 'Soul Archive', desc: 'Soul capacity control', baseCost: 160 },
  ],
  '훈련소': [
    { id: 'weaponRack', name: 'Weapon Rack', desc: 'Training readiness', baseCost: 90 },
    { id: 'trainingDummy', name: 'Training Dummy', desc: 'Daily training XP', baseCost: 110 },
    { id: 'targetRange', name: 'Target Range', desc: 'Ranged practice', baseCost: 130 },
  ],
  '식당': [
    { id: 'cookStation', name: 'Cook Station', desc: 'Food sales income', baseCost: 100 },
    { id: 'guestTables', name: 'Guest Tables', desc: 'Guest capacity', baseCost: 120 },
    { id: 'pantry', name: 'Pantry', desc: 'Arrival stability', baseCost: 140 },
  ],
}

export function createInitialRoomFacilities(): RoomFacilityState {
  return Object.fromEntries(Object.entries(ROOM_FACILITY_DEFS).map(([room, defs]) => [room, Object.fromEntries(defs.map(def => [def.id, 0]))])) as RoomFacilityState
}

export function normalizeRoomFacilities(value: Partial<RoomFacilityState> | undefined): RoomFacilityState {
  const next = createInitialRoomFacilities()
  if (!value) return next
  for (const room of Object.keys(ROOM_FACILITY_DEFS) as RoomId[]) {
    for (const def of ROOM_FACILITY_DEFS[room]) next[room][def.id] = Math.max(0, Math.min(3, value[room]?.[def.id] ?? 0))
  }
  return next
}

export function getRoomFacilityRows(room: RoomId, roomLevels: Record<string, number>, facilities: RoomFacilityState): RoomFacilityRow[] {
  const targetLevel = Math.max(1, Math.min(3, roomLevels[room] ?? 1))
  return ROOM_FACILITY_DEFS[room].map(def => {
    const level = facilities[room]?.[def.id] ?? 0
    const completeForTier = level >= targetLevel
    return { ...def, level, targetLevel, completeForTier, canUpgrade: level < targetLevel, cost: level < targetLevel ? def.baseCost * (level + 1) * targetLevel : 0, resourceCost: roomFacilityResourceCost(room, def.id, roomLevels, facilities) }
  })
}

export function canUpgradeRoomTier(room: RoomId, roomLevels: Record<string, number>, facilities: RoomFacilityState): { ok: boolean; missingNames: string[] } {
  const missingNames = getRoomFacilityRows(room, roomLevels, facilities).filter(row => !row.completeForTier).map(row => row.name)
  return { ok: missingNames.length === 0, missingNames }
}

export function roomFacilityUpgradeCost(room: RoomId, facilityId: string, roomLevels: Record<string, number>, facilities: RoomFacilityState): number {
  return getRoomFacilityRows(room, roomLevels, facilities).find(row => row.id === facilityId)?.cost ?? 0
}

export function upgradeRoomFacilityState(facilities: RoomFacilityState, room: RoomId, facilityId: string): RoomFacilityState {
  const next = normalizeRoomFacilities(facilities)
  return { ...next, [room]: { ...next[room], [facilityId]: Math.min(3, (next[room]?.[facilityId] ?? 0) + 1) } }
}
