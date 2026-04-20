export type Race = '엘프' | '인간' | '드워프' | '수인'
export type Gender = '남' | '여'
export type MercenaryClass = '궁수' | '성직자' | '도적' | '마법사' | '전사'
export type MercenaryGrade = 'D' | 'C' | 'B' | 'A' | 'S'
export type MercenaryStatus = '대기중' | '파견중' | '부상'
export type BuildingId = 'hall' | 'barracks' | 'training' | 'tavern' | 'infirmary'

export interface Weapon {
  id: string
  name: string
  icon: string
  class: MercenaryClass
  tier: 1 | 2 | 3
  powerBonus: number    // 기본 전력 보정
  atkBonus: number      // 공격력 보정
  trapBonus: number     // 함정해제 보정
  survBonus: number     // 생존율 보정
  upgradeCost: number   // 다음 티어 업그레이드 비용 (0 = 최대)
  raceBonus: Partial<Record<Race, number>>  // 종족별 추가 전력
}

export interface Traits {
  cooperation: number
  ego: number
  gender: Gender
  synergy_factor: number
}

export interface Mercenary {
  id: string
  name: string
  age: number
  race: Race
  class: MercenaryClass
  grade: MercenaryGrade
  power: number          // base power (condition-adjusted in calculations)
  element: '불' | '얼음' | '번개' | '자연' | '암흑' | '빛'
  trap_disarm: number
  condition: number      // 0-100, degrades on quests, recovers idle
  hp: number
  cost: number           // hire cost (one-time)
  deathCost: number      // funeral compensation if killed on quest
  traits: Traits
  stats: {
    공격력: number
    함정해제: number
    생존율: number
    협조성: number
  }
  dailyWage: number
  favorability: number   // 0-100, 길드장과의 호감도
  status: MercenaryStatus
  weaponId: string       // 장착 무기 ID
  room: '훈련소' | '길드마스터룸' | '식당'
  level: number          // 1-10, gained from quests
  experience: number
  expToNext: number
}

export interface Quest {
  id: string
  name: string
  difficulty: number     // total effective power needed to reliably succeed
  reward: {
    gold: number
    food: number
    fame: number
    exp: number          // XP awarded per merc on success
  }
  description: string
  slots: number          // max mercs (1-4)
  minSlots: number       // minimum mercs required to launch
  duration: number       // days to complete
  deathRisk: number      // base per-merc death probability on failure
  conditionDrain: number // condition lost per day while on this quest
  dailyGoldCost: number  // supply cost deducted each day quest is active
  element: '불' | '얼음' | '번개' | '자연' | '암흑' | '빛'
  trapFocus: boolean     // true = trap disarm skill matters significantly
}

export interface ActiveQuest {
  questId: string
  assignedMercIds: string[]
  completesAt: number   // Unix timestamp ms when quest finishes
  durationMs: number    // total duration in ms (for progress bar)
}

export interface GuildBuildings {
  hall: number       // 1-4: simultaneous quest slots
  barracks: number   // 1-4: arrival frequency & count
  training: number   // 1-4: XP multiplier
  tavern: number     // 1-4: arrival grade quality
  infirmary: number  // 0-4: condition recovery rate (0 = not built yet)
}

export interface CampaignState {
  day: number
  gold: number
  food: number
  fame: number
  morale: number
}
