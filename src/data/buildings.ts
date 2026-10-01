import type { GuildBuildings } from '../types'

export const BUILDING_INFO = {
  hall:      { name: '길드 홀',  icon: '🏰', maxLevel: 4, buildCost: 0,
               desc: (lv: number) => `동시 계약 ${[2,3,4,5][Math.min(lv-1,3)]}개` },
  barracks:  { name: '병영',     icon: '⛺', maxLevel: 4, buildCost: 300,
               desc: (lv: number) => `${[3,3,2,2][lv-1]}일마다 ${[1,2,3,4][lv-1]}명 도착` },
  training:  { name: '훈련소',   icon: '⚔️', maxLevel: 4, buildCost: 400,
               desc: (lv: number) => `경험치 +${[0,30,70,120][lv-1]}%` },
  tavern:    { name: '선술집',   icon: '🍺', maxLevel: 4, buildCost: 600,
               desc: (lv: number) => ['D~C급','D~B급','D~A급','D~S급'][lv-1]+' 용병 유치' },
  infirmary: { name: '의무소',   icon: '❤️‍🩹', maxLevel: 4, buildCost: 400,
               desc: (lv: number) => `컨디션 회복 +${[8,15,25,40][lv-1]}/일` },
} as const

export const ROOM_UPGRADE_COSTS: Record<string, readonly [number, number]> = {
  '길드마스터룸': [500, 1200],
  '훈련소':       [150, 350],
  '식당':         [200, 500],
}

export const ROOM_EFFECTS: Record<string, { desc: string[]; icon: string }> = {
  '길드마스터룸': { icon: '👑', desc: ['호감도+1/일', '호감도+2/일', '호감도+3/일'] },
  '훈련소':       { icon: '⚔️', desc: ['XP+1/일', 'XP+3/일', 'XP+6/일'] },
  '식당':         { icon: '🍖', desc: ['최대 6명 고용', '최대 9명, 도착+1명', '최대 12명, 도착+2명'] },
}

export const upgradeBuildingCost = (id: keyof GuildBuildings, currentLevel: number): number => {
  const bases: Record<string, number> = { hall: 500, barracks: 300, training: 400, tavern: 600, infirmary: 400 }
  return Math.round(bases[id] * Math.pow(2, currentLevel))
}

export const maxSimultaneousQuests = (hallLv: number) => [2, 3, 4, 5][Math.min(hallLv - 1, 3)]
export const arrivalInterval       = (barracksLv: number) => [3, 3, 2, 2][barracksLv - 1] ?? 3
export const arrivalCount          = (barracksLv: number) => [3, 4, 5, 6][barracksLv - 1] ?? 3
export const condRecovery          = (infLv: number)      => [0, 8, 15, 25, 40][infLv] ?? 0
export const xpMultiplier          = (trainLv: number)    => [1.0, 1.3, 1.7, 2.2][trainLv - 1] ?? 1.0

export const trainingCapacity   = (lv: number) => [2, 4, 6][Math.min(lv - 1, 2)]
export const trainingXPPerDay   = (lv: number) => [1, 3, 6][Math.min(lv - 1, 2)]
export const masterCapacity     = (lv: number) => [1, 2, 3][Math.min(lv - 1, 2)]
export const masterFavBonus     = (lv: number) => [1, 2, 3][Math.min(lv - 1, 2)]
export const maxHireCap         = (lv: number) => [6, 9, 12][Math.min(lv - 1, 2)]
export const diningArrivalBonus = (lv: number) => [0, 1, 2][Math.min(lv - 1, 2)]
export const diningTavernBonus  = (lv: number) => [0, 1, 2][Math.min(lv - 1, 2)]
