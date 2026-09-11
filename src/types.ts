export type Race = '엘프' | '인간' | '드워프' | '수인'
export type Gender = '남' | '여'
export type MercenaryClass = '궁수' | '성직자' | '도적' | '마법사' | '전사'
export type MercenaryGrade = 'D' | 'C' | 'B' | 'A' | 'S'
export type MercenaryStatus = '대기중' | '파견중' | '부상' | '영혼'
export type BuildingId = 'hall' | 'barracks' | 'training' | 'tavern' | 'infirmary'
export type RoomId = '훈련소' | '길드마스터룸' | '식당'
export type RoomFacilityState = Record<RoomId, Record<string, number>>
export type UpgradeResourceId = 'wood' | 'stone' | 'crest'
export type UpgradeResourceState = Record<UpgradeResourceId, number>
export type UpgradeResourceCost = Partial<Record<UpgradeResourceId, number>>
export type EquipSlot = 'weapon' | 'head' | 'body' | 'accessory'
export type EquipGrade = 'D' | 'C' | 'B' | 'A' | 'S'

// Keep Weapon for backward-compat during migration only — will be removed after
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

export interface PassiveEffect {
  type:
    | 'quest_success_morale'       // quest success: morale +N
    | 'same_element_death_resist'  // death risk -N% on element-matched quest
    | 'trap_bonus'                 // trap success rate +N%
    | 'survival_bonus'             // surv stat +N (flat)
    | 'morale_recovery_on_kill'    // quest success morale +N (stacks with base)
    | 'guild_fame_bonus'           // fame +N on quest success
  value: number
  condition?: string               // UI display text
}

export interface SetBonus {
  requiredCount: 2 | 3 | 4
  description: string
  effects: PassiveEffect[]
}

export interface Equipment {
  id: string
  name: string
  slot: EquipSlot
  grade: EquipGrade
  setId?: string
  powerBonus: number
  atkBonus: number
  trapBonus: number
  survBonus: number
  moraleBonus: number            // morale cap adjustment while equipped
  classBonus?: Partial<Record<MercenaryClass, number>>  // extra powerBonus per class
  passive?: PassiveEffect
  buyCost: number                // base buy price (merchant charges × 1.2)
  icon: string
}

export interface SetDefinition {
  id: string
  name: string
  bonuses: SetBonus[]
}

export interface ActiveDungeon {
  id: string
  name: string
  maxFloor: number
  currentFloor: number           // 1-indexed, next floor to attempt
  clearedFloors: number
  element: '불' | '얼음' | '자연' | '암흑' | '빛'
  status: 'active' | 'completed' | 'abandoned'
  activeDungeonQuestId?: string  // ActiveQuest ID for the currently dispatched floor
}

export interface Traits {
  cooperation: number
  ego: number
  gender: Gender
  synergy_factor: number
}

export interface MercPassive {
  id: string
  name: string
  desc: string
  powerBonus: number
  atkBonus: number
  trapBonus: number
  survBonus: number
  hpBonus: number
  deathRiskMod: number  // e.g. -0.05 = death risk ×0.95
  xpMod: number         // e.g. 0.15 = XP +15%
}

export interface PassiveSynergy {
  passiveIds: [string, string]
  desc: string
  powerBonus: number
  atkBonus: number
  trapBonus: number
  survBonus: number
  deathRiskMod: number
}

export interface Mercenary {
  id: string
  name: string
  age: number
  ageLockedUntil?: number
  race: Race
  class: MercenaryClass
  grade: MercenaryGrade
  startingGrade: MercenaryGrade  // original grade at hire
  passives: string[]             // MercPassive IDs
  power: number
  element: '불' | '얼음' | '자연' | '암흑' | '빛'
  trap_disarm: number
  condition: number
  hp: number
  cost: number
  deathCost: number
  reviveCount?: number
  traits: Traits
  stats: {
    공격력: number
    함정해제: number
    생존율: number
    협조성: number
  }
  dailyWage: number
  favorability: number
  morale: number
  status: MercenaryStatus
  equipment: {
    weapon:    string | null   // Equipment.id
    head:      string | null
    body:      string | null
    accessory: string | null
  }
  room: RoomId
  level: number
  experience: number
  expToNext: number
  leavingAt?: number   // timestamp: merc will auto-leave after this time
}

export interface Quest {
  id: string
  name: string
  difficulty: number
  reward: {
    gold: number
    fame: number
    exp: number
  }
  description: string
  slots: number
  minSlots: number
  duration: number
  deathRisk: number
  conditionDrain: number
  dailyGoldCost: number
  element: '불' | '얼음' | '자연' | '암흑' | '빛'
  trapFocus: boolean
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
  dungeonFloor?: number          // set if this ActiveQuest is a dungeon floor dispatch
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
  lastDayDate?: string   // ISO date "YYYY-MM-DD" — last real-calendar day processed
}

export interface MerchantState {
  active: boolean
  stock: Equipment[]
  departsAt: number
}

export interface ExpeditionResult {
  rank: number
  total: number
  goldReward: number
  fameReward: number
  xpReward: number
  crystalReward: number
  equipReward: Equipment | null
}

export interface ActiveExpedition {
  id: string
  assignedMercIds: string[]
  startedAt: number
  completesAt: number
  npcScores: number[]     // simulated competitors' power
  result?: ExpeditionResult
  nextAvailableAt: number // when next expedition can be launched
}

export type ReturnActivityId = 'feast' | 'review' | 'care'

export interface ReturnParticipantSnapshot {
  id: string
  name: string
  status: MercenaryStatus
}

export interface ReturnEpisodeChoice {
  id: ReturnActivityId
  label: string
  description: string
}

export interface ReturnEpisode {
  id: string             // `${questId}:${completesAt}` — stable across duplicate resolutions
  questId: string
  completesAt: number
  questName: string
  success: boolean
  cause: string           // deterministic, concrete: names an actual participant
  participants: ReturnParticipantSnapshot[]
  choices: ReturnEpisodeChoice[]
}

export interface ReturnActivityFeedback {
  activityId: ReturnActivityId
  participantIds: string[]
  visualRoom: RoomId
  visualAnchor?: 'infirmary'
  actionLabel: string
  rewardLabel: string
}

export interface ReturnEpisodeState {
  pending: ReturnEpisode[]
  processedIds: string[]
  activeFeedback: ReturnActivityFeedback | null
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
  roomFacilities?: RoomFacilityState
  upgradeResources?: UpgradeResourceState
  completedQuestIds: string[]
  guildInventory: Equipment[]
  merchantState: MerchantState | null
  activeDungeon: ActiveDungeon | null
  activeExpedition: ActiveExpedition | null
  expeditionNextAt: number   // timestamp when expedition is available again
  returnEpisodeState?: ReturnEpisodeState
}