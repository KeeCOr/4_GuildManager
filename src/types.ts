export type Race = '엘프' | '인간' | '드워프' | '수인'
export type Gender = '남' | '여'
export type MercenaryClass = '궁수' | '성직자' | '도적' | '마법사' | '전사'
export type MercenaryGrade = 'D' | 'C' | 'B' | 'A' | 'S'
export type MercenaryStatus = '대기중' | '파견중' | '부상' | '영혼'
export type BuildingId = 'hall' | 'barracks' | 'training' | 'tavern' | 'infirmary'
export type RoomId = '훈련소' | '길드마스터룸' | '식당' | '마법훈련소' | '레인저훈련소' | '전사훈련소'
export type QuestType = 'combat' | 'escort' | 'dungeon' | 'trap' | 'hunt' | 'monster' | 'support' | 'patrol'
export type SpecialtyTag =
  | 'dungeon_veteran'
  | 'escort_expert'
  | 'trap_specialist'
  | 'survivor'
  | 'lone_wolf'
  | 'iron_will'
  | 'beast_slayer'
  | 'shadow_walker'

export interface Potential {
  maxGrade: MercenaryGrade
  revealed: boolean
  awakened: boolean
}

export interface Weapon {
  id: string
  name: string
  icon: string
  class: MercenaryClass
  tier: 1 | 2 | 3
  powerBonus: number
  atkBonus: number
  trapBonus: number
  survBonus: number
  upgradeCost: number
  raceBonus: Partial<Record<Race, number>>
}

export interface Traits {
  cooperation: number
  ego: number
  gender: Gender
  synergy_factor: number
  ambition: number
  loyalty: number
  professionalism: number
  mentality: number
}

export interface Mercenary {
  id: string
  name: string
  age: number
  ageLockedUntil?: number
  race: Race
  class: MercenaryClass
  grade: MercenaryGrade
  potential: Potential
  power: number
  element: '불' | '얼음' | '번개' | '자연' | '암흑' | '빛'
  trap_disarm: number
  condition: number
  hp: number
  cost: number
  deathCost: number
  traits: Traits
  stats: {
    공격력: number
    함정해제: number
    생존율: number
    협조성: number
  }
  dailyWage: number
  favorability: number
  status: MercenaryStatus
  weaponId: string
  room: RoomId
  level: number
  experience: number
  expToNext: number
  specialtyTags: SpecialtyTag[]
  questHistory: Partial<Record<QuestType | string, number>>
  consecutiveDispatches: number
  lastDispatchEndDay: number
  idleDays: number
  specialtyBonuses: {
    elementBonus: number
    survBonus: number
    atkBonus: number
  }
}

export interface Quest {
  id: string
  name: string
  questType: QuestType
  clientId: string
  difficulty: number
  reward: {
    gold: number
    fame: number
    exp: number
  }
  famePenalty: number
  description: string
  slots: number
  minSlots: number
  duration: number
  deathRisk: number
  conditionDrain: number
  dailyGoldCost: number
  element: '불' | '얼음' | '번개' | '자연' | '암흑' | '빛'
  trapFocus: boolean
  isUrgentEligible: boolean
  requiredQuestId?: string
  chainId?: string
  chainName?: string
  storyAfter?: { title: string; lines: string[] }
}

export interface ActiveQuest {
  questId: string
  assignedMercIds: string[]
  completesAt: number
  durationMs: number
}

export interface Client {
  id: string
  name: string
  faction: 'merchant' | 'noble' | 'church' | 'military' | 'mage' | 'rogue'
  icon: string
  description: string
  questBonus: number
}

export interface QuestReport {
  questId: string
  questName: string
  success: boolean
  mvpId?: string
  poorPerformerId?: string
  mercPerformance: Record<string, 'excellent' | 'normal' | 'poor'>
  bonusApplied: boolean
  timestamp: number
}

export interface GuildBuildings {
  hall: number
  barracks: number
  training: number
  tavern: number
  infirmary: number
}

export interface CampaignState {
  day: number
  gold: number
  fame: number
  morale: number
  crystals: number
  magicStones: number
}

export interface SaveSlotData {
  name: string
  day: number
  timestamp: number
  mercs: Mercenary[]
  activeQuests: ActiveQuest[]
  buildings: GuildBuildings
  campaignState: CampaignState
  questLog: string[]
  gateArrivals: Mercenary[]
  nextArrivalTime: number
  nextMoraleDropAt: number
  questPool: string[]
  roomLevels: Record<string, number>
  completedQuestIds: string[]
  clientRelations: Record<string, number>
  urgentQuestIds: string[]
  urgentQuestExpiries: Record<string, number>
  pendingReports: QuestReport[]
}
