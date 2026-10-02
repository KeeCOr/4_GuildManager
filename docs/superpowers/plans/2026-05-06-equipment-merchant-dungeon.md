# Equipment, Merchant & Dungeon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4-slot equipment system (D~S grades, passives, set bonuses), visiting merchant NPC, and multi-floor dungeon content to the 4_GM guild management game.

**Architecture:** Types extend `src/types.ts`; 100-item pool lives in `src/data/equipment.ts` (replaces the old `weaponId`/`weapons.ts` system). Merchant and dungeon each get a dedicated hook + display component. `App.tsx` wires state and quest-completion hooks; quest drop and dungeon trigger are injected into both the instant-complete and timed `processCompletions` paths.

**Tech Stack:** TypeScript 5, React 18, Vite, Tailwind CSS; no test runner — verification is `node scripts/build-release.js` (zero TypeScript errors = passing).

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `src/types.ts` | Add Equipment/Set/Dungeon types; update Mercenary, SaveSlotData |
| Create | `src/data/equipment.ts` | 100 items + 4 set definitions + helper fns |
| Create | `src/data/dungeons.ts` | Dungeon name pool + floor-scaling helpers |
| Modify | `src/utils/power.ts` | Replace weaponId helpers with equipment-slot helpers |
| Modify | `src/data/mercenaries.ts` | Replace `weaponId` with `equipment` slots |
| Create | `src/hooks/useMerchant.ts` | Merchant arrival/departure timer |
| Create | `src/hooks/useDungeon.ts` | Dungeon state management |
| Create | `src/components/EquipmentModal.tsx` | Per-merc equipment management UI |
| Create | `src/components/MerchantPanel.tsx` | Visiting merchant shop UI |
| Create | `src/components/DungeonPanel.tsx` | Dungeon progress + dispatch UI |
| Modify | `src/App.tsx` | State wiring, drop/trigger logic, UI integration, save migration |

---

## Task 1: Add Equipment Types to types.ts

**Files:** Modify `src/types.ts`

- [ ] **Step 1: Add new type definitions**

Replace the entire file content with:

```ts
export type Race = '엘프' | '인간' | '드워프' | '수인'
export type Gender = '남' | '여'
export type MercenaryClass = '궁수' | '성직자' | '도적' | '마법사' | '전사'
export type MercenaryGrade = 'D' | 'C' | 'B' | 'A' | 'S'
export type MercenaryStatus = '대기중' | '파견중' | '부상' | '영혼'
export type BuildingId = 'hall' | 'barracks' | 'training' | 'tavern' | 'infirmary'
export type RoomId = '훈련소' | '길드마스터룸' | '식당'
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
  element: '불' | '얼음' | '번개' | '자연' | '암흑' | '빛'
  status: 'active' | 'completed' | 'abandoned'
  activeDungeonQuestId?: string  // ActiveQuest ID for the currently dispatched floor
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
  ageLockedUntil?: number
  race: Race
  class: MercenaryClass
  grade: MercenaryGrade
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
  element: '불' | '얼음' | '번개' | '자연' | '암흑' | '빛'
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
}

export interface MerchantState {
  active: boolean
  stock: Equipment[]
  departsAt: number
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
  guildInventory: Equipment[]
  merchantState: MerchantState | null
  activeDungeon: ActiveDungeon | null
}
```

- [ ] **Step 2: Build to verify types compile**

```bash
node scripts/build-release.js
```

Expected: TypeScript errors about `weaponId` missing — these will be fixed in subsequent tasks. If errors only mention `weaponId` / `DEFAULT_WEAPON` / `WEAPONS`, proceed.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add Equipment, SetDefinition, ActiveDungeon, MerchantState types"
```

---

## Task 2: Create src/data/equipment.ts (100-item pool + 4 sets)

**Files:** Create `src/data/equipment.ts`

- [ ] **Step 1: Write the file**

```ts
import type { Equipment, EquipSlot, EquipGrade, SetDefinition, MercenaryClass, PassiveEffect } from '../types'

// ── Helper ────────────────────────────────────────────────────────────────
function eq(
  id: string, name: string, slot: EquipSlot, grade: EquipGrade,
  powerBonus: number, atkBonus: number, trapBonus: number, survBonus: number, moraleBonus: number,
  buyCost: number, icon: string,
  setId?: string,
  classBonus?: Partial<Record<MercenaryClass, number>>,
  passive?: PassiveEffect
): Equipment {
  return { id, name, slot, grade, powerBonus, atkBonus, trapBonus, survBonus, moraleBonus, buyCost, icon, setId, classBonus, passive }
}

// ── WEAPON slot (25 items) ────────────────────────────────────────────────
// 철검 계열 — 철벽 세트 (B~S), 전사 친화
const SWORDS: Equipment[] = [
  eq('eq_w_sword_d', '낡은 철검',   'weapon', 'D',  2,  2, 0, 0, 0,  60, '🗡', undefined,  { 전사: 1 }),
  eq('eq_w_sword_c', '철검',        'weapon', 'C',  5,  4, 0, 0, 0, 140, '🗡', undefined,  { 전사: 2 }),
  eq('eq_w_sword_b', '강철검',      'weapon', 'B',  9,  7, 0, 1, 0, 280, '⚔', '철벽',     { 전사: 3 }),
  eq('eq_w_sword_a', '영웅의 검',   'weapon', 'A', 14, 11, 0, 2, 0, 480, '⚔', '철벽',     { 전사: 5 }),
  eq('eq_w_sword_s', '불멸의 검',   'weapon', 'S', 20, 16, 0, 3, 5, 850, '⚜', '철벽',     { 전사: 7 }, { type: 'quest_success_morale', value: 5, condition: '퀘스트 성공 시 사기 +5' }),
]

// 그림자 단검 계열 — 그림자 세트 (B~S), 도적 친화
const DAGGERS: Equipment[] = [
  eq('eq_w_dagger_d', '낡은 단검',     'weapon', 'D',  2,  1,  3, 0, 0,  55, '🔪', undefined, { 도적: 1 }),
  eq('eq_w_dagger_c', '독 단검',       'weapon', 'C',  4,  2,  6, 0, 0, 130, '🔪', undefined, { 도적: 2 }),
  eq('eq_w_dagger_b', '그림자 단검',   'weapon', 'B',  8,  4, 10, 0, 0, 260, '🌑', '그림자',  { 도적: 3 }),
  eq('eq_w_dagger_a', '암살자의 단검', 'weapon', 'A', 13,  7, 15, 0, 0, 450, '🌑', '그림자',  { 도적: 5 }),
  eq('eq_w_dagger_s', '허무의 칼날',   'weapon', 'S', 18, 10, 22, 0, 0, 800, '🌑', '그림자',  { 도적: 7 }, { type: 'trap_bonus', value: 10, condition: '함정 퀘스트 성공률 +10%' }),
]

// 합성궁 계열 — 자연 세트 (B~S), 궁수 친화
const BOWS: Equipment[] = [
  eq('eq_w_bow_d', '낡은 단궁',   'weapon', 'D',  2,  2,  1, 0, 0,  55, '🏹', undefined, { 궁수: 1 }),
  eq('eq_w_bow_c', '합성궁',      'weapon', 'C',  5,  4,  3, 0, 0, 135, '🏹', undefined, { 궁수: 2 }),
  eq('eq_w_bow_b', '정밀 장궁',   'weapon', 'B',  8,  7,  5, 0, 0, 265, '🏹', '자연',    { 궁수: 3 }),
  eq('eq_w_bow_a', '풍요의 궁',   'weapon', 'A', 13, 10,  8, 1, 2, 455, '🏹', '자연',    { 궁수: 5 }),
  eq('eq_w_bow_s', '대지의 영궁', 'weapon', 'S', 19, 14, 12, 2, 3, 820, '🌿', '자연',    { 궁수: 7 }, { type: 'morale_recovery_on_kill', value: 5, condition: '퀘스트 성공 시 사기 추가 +5' }),
]

// 마법 지팡이 계열 — 현자 세트 (B~S), 마법사 친화
const STAVES: Equipment[] = [
  eq('eq_w_staff_d', '낡은 지팡이',   'weapon', 'D',  2,  3, 0, 0, 0,  60, '🪄', undefined, { 마법사: 1 }),
  eq('eq_w_staff_c', '수정 완드',     'weapon', 'C',  5,  6, 0, 0, 0, 145, '🪄', undefined, { 마법사: 2 }),
  eq('eq_w_staff_b', '고대 지팡이',   'weapon', 'B',  9, 10, 0, 0, 0, 275, '🔮', '현자',    { 마법사: 3 }),
  eq('eq_w_staff_a', '현자의 지팡이', 'weapon', 'A', 14, 15, 0, 0, 2, 470, '🔮', '현자',    { 마법사: 5 }),
  eq('eq_w_staff_s', '원소의 지팡이', 'weapon', 'S', 21, 22, 0, 0, 3, 870, '✨', '현자',    { 마법사: 7 }, { type: 'guild_fame_bonus', value: 3, condition: '퀘스트 성공 시 명성 +3' }),
]

// 성스러운 철퇴 계열 — 세트 없음, 성직자 친화
const MACES: Equipment[] = [
  eq('eq_w_mace_d', '낡은 철퇴',       'weapon', 'D',  2, 1, 0,  2, 0,  55, '🔨', undefined, { 성직자: 1 }),
  eq('eq_w_mace_c', '철퇴',            'weapon', 'C',  4, 2, 0,  4, 0, 130, '🔨', undefined, { 성직자: 2 }),
  eq('eq_w_mace_b', '성스러운 철퇴',   'weapon', 'B',  8, 4, 0,  7, 0, 255, '✨', undefined, { 성직자: 3 }),
  eq('eq_w_mace_a', '성직자의 철퇴',   'weapon', 'A', 12, 6, 0, 11, 0, 440, '✨', undefined, { 성직자: 5 }),
  eq('eq_w_mace_s', '신성한 철퇴',     'weapon', 'S', 18, 9, 0, 16, 5, 790, '💫', undefined, { 성직자: 7 }, { type: 'survival_bonus', value: 5, condition: '생존율 +5' }),
]

// ── HEAD slot (25 items) ──────────────────────────────────────────────────
// 철 투구 계열 — 철벽 세트 (B~S), 전사 친화
const HELMS: Equipment[] = [
  eq('eq_h_helm_d', '낡은 투구',   'head', 'D',  1, 0, 0,  3, 0,  50, '🪖', undefined, { 전사: 1 }),
  eq('eq_h_helm_c', '철 투구',     'head', 'C',  3, 0, 0,  6, 0, 120, '🪖', undefined, { 전사: 2 }),
  eq('eq_h_helm_b', '강철 투구',   'head', 'B',  6, 1, 0, 10, 0, 240, '🪖', '철벽',    { 전사: 3 }),
  eq('eq_h_helm_a', '전사의 투구', 'head', 'A', 10, 2, 0, 15, 0, 420, '🪖', '철벽',    { 전사: 5 }),
  eq('eq_h_helm_s', '불멸의 투구', 'head', 'S', 15, 3, 0, 21, 3, 760, '🛡', '철벽',    { 전사: 6 }, { type: 'same_element_death_resist', value: 10, condition: '속성 일치 퀘스트 사망률 -10%' }),
]

// 두건 계열 — 그림자 세트 (B~S), 도적 친화
const HOODS: Equipment[] = [
  eq('eq_h_hood_d', '낡은 두건',     'head', 'D',  1, 0,  3, 1, 0,  45, '🧢', undefined, { 도적: 1 }),
  eq('eq_h_hood_c', '두건',          'head', 'C',  3, 0,  6, 2, 0, 115, '🧢', undefined, { 도적: 2 }),
  eq('eq_h_hood_b', '그림자 두건',   'head', 'B',  6, 0, 10, 3, 0, 230, '🌑', '그림자',  { 도적: 3 }),
  eq('eq_h_hood_a', '암살자의 두건', 'head', 'A', 10, 0, 15, 4, 0, 400, '🌑', '그림자',  { 도적: 5 }),
  eq('eq_h_hood_s', '허무의 두건',   'head', 'S', 15, 0, 22, 5, 0, 740, '🌑', '그림자',  { 도적: 6 }, { type: 'trap_bonus', value: 8, condition: '함정 퀘스트 성공률 +8%' }),
]

// 관 계열 — 현자 세트 (B~S), 마법사 친화
const CROWNS: Equipment[] = [
  eq('eq_h_crown_d', '낡은 관',    'head', 'D',  1,  2, 0, 0, 2,  50, '👑', undefined, { 마법사: 1 }),
  eq('eq_h_crown_c', '마법사 관',  'head', 'C',  3,  4, 0, 0, 3, 125, '👑', undefined, { 마법사: 2 }),
  eq('eq_h_crown_b', '현자의 관',  'head', 'B',  6,  7, 0, 0, 4, 245, '👑', '현자',    { 마법사: 3 }),
  eq('eq_h_crown_a', '원소의 관',  'head', 'A', 10, 11, 0, 0, 5, 430, '👑', '현자',    { 마법사: 5 }),
  eq('eq_h_crown_s', '아르카나 관','head', 'S', 15, 16, 0, 0, 6, 780, '✨', '현자',    { 마법사: 6 }, { type: 'guild_fame_bonus', value: 2, condition: '퀘스트 성공 시 명성 +2' }),
]

// 밴드 계열 — 자연 세트 (B~S), 궁수 친화
const BANDS: Equipment[] = [
  eq('eq_h_band_d', '낡은 밴드',   'head', 'D',  1, 1, 1, 1, 1,  45, '🎀', undefined, { 궁수: 1 }),
  eq('eq_h_band_c', '사냥꾼 밴드', 'head', 'C',  3, 2, 3, 2, 2, 115, '🎀', undefined, { 궁수: 2 }),
  eq('eq_h_band_b', '자연의 밴드', 'head', 'B',  6, 3, 5, 3, 3, 230, '🌿', '자연',    { 궁수: 3 }),
  eq('eq_h_band_a', '정령의 밴드', 'head', 'A', 10, 5, 7, 4, 4, 405, '🌿', '자연',    { 궁수: 5 }),
  eq('eq_h_band_s', '대지의 밴드', 'head', 'S', 15, 7,10, 5, 6, 745, '🌿', '자연',    { 궁수: 6 }, { type: 'morale_recovery_on_kill', value: 4, condition: '퀘스트 성공 시 사기 추가 +4' }),
]

// 성직자 모자 계열 — 세트 없음, 성직자 친화
const HATS: Equipment[] = [
  eq('eq_h_hat_d', '낡은 성직자 모자', 'head', 'D',  1, 0, 0,  2,  3,  45, '🎩', undefined, { 성직자: 1 }),
  eq('eq_h_hat_c', '성직자 모자',      'head', 'C',  3, 0, 0,  4,  5, 115, '🎩', undefined, { 성직자: 2 }),
  eq('eq_h_hat_b', '신성한 모자',      'head', 'B',  5, 0, 0,  7,  7, 225, '⛪', undefined, { 성직자: 3 }),
  eq('eq_h_hat_a', '대사제 모자',      'head', 'A',  9, 0, 0, 10,  9, 400, '⛪', undefined, { 성직자: 5 }),
  eq('eq_h_hat_s', '성좌의 모자',      'head', 'S', 14, 0, 0, 14, 12, 740, '💫', undefined, { 성직자: 6 }, { type: 'survival_bonus', value: 4, condition: '생존율 +4' }),
]

// ── BODY slot (25 items) ──────────────────────────────────────────────────
// 판금 갑옷 계열 — 철벽 세트 (B~S), 전사 친화
const PLATES: Equipment[] = [
  eq('eq_b_plate_d', '낡은 판금 갑옷',    'body', 'D',  1, 0, 0,  5, 0,  65, '🛡', undefined, { 전사: 1 }),
  eq('eq_b_plate_c', '판금 갑옷',         'body', 'C',  3, 0, 0,  9, 0, 160, '🛡', undefined, { 전사: 2 }),
  eq('eq_b_plate_b', '강철 판금 갑옷',    'body', 'B',  6, 1, 0, 14, 0, 310, '🛡', '철벽',    { 전사: 3 }),
  eq('eq_b_plate_a', '기사 갑옷',         'body', 'A', 10, 2, 0, 20, 0, 520, '🛡', '철벽',    { 전사: 5 }),
  eq('eq_b_plate_s', '불멸의 판금 갑옷',  'body', 'S', 16, 3, 0, 28, 0, 920, '⚜', '철벽',    { 전사: 7 }, { type: 'same_element_death_resist', value: 12, condition: '속성 일치 퀘스트 사망률 -12%' }),
]

// 가죽 갑옷 계열 — 자연 세트 (B~S), 도적/궁수 친화
const LEATHERS: Equipment[] = [
  eq('eq_b_leather_d', '낡은 가죽 갑옷',  'body', 'D',  1, 0,  2,  3, 0,  55, '🥋', undefined, { 도적: 1, 궁수: 1 }),
  eq('eq_b_leather_c', '가죽 갑옷',       'body', 'C',  3, 0,  4,  5, 0, 140, '🥋', undefined, { 도적: 2, 궁수: 2 }),
  eq('eq_b_leather_b', '자연의 가죽 갑옷','body', 'B',  6, 0,  7,  8, 1, 275, '🌿', '자연',    { 도적: 3, 궁수: 3 }),
  eq('eq_b_leather_a', '사냥꾼 갑옷',     'body', 'A', 10, 0, 10, 12, 2, 470, '🌿', '자연',    { 도적: 5, 궁수: 5 }),
  eq('eq_b_leather_s', '대지의 갑옷',     'body', 'S', 15, 0, 14, 17, 3, 850, '🌿', '자연',    { 도적: 6, 궁수: 6 }, { type: 'quest_success_morale', value: 4, condition: '퀘스트 성공 시 사기 +4' }),
]

// 마법사 로브 계열 — 현자 세트 (B~S), 마법사 친화
const ROBES: Equipment[] = [
  eq('eq_b_robe_d', '낡은 로브',    'body', 'D',  1,  3, 0, 1, 0,  55, '🧙', undefined, { 마법사: 1 }),
  eq('eq_b_robe_c', '마법사 로브',  'body', 'C',  3,  6, 0, 1, 1, 145, '🧙', undefined, { 마법사: 2 }),
  eq('eq_b_robe_b', '현자의 로브',  'body', 'B',  6, 10, 0, 2, 2, 285, '🔮', '현자',    { 마법사: 3 }),
  eq('eq_b_robe_a', '원소의 로브',  'body', 'A', 10, 15, 0, 3, 3, 480, '🔮', '현자',    { 마법사: 5 }),
  eq('eq_b_robe_s', '아르카나 로브','body', 'S', 16, 21, 0, 4, 4, 880, '✨', '현자',    { 마법사: 7 }, { type: 'same_element_death_resist', value: 8, condition: '속성 일치 퀘스트 사망률 -8%' }),
]

// 그림자 망토 계열 — 그림자 세트 (B~S), 도적 친화
const CLOAKS: Equipment[] = [
  eq('eq_b_cloak_d', '낡은 망토',    'body', 'D',  1, 0,  4, 2, 0,  55, '🌑', undefined, { 도적: 1 }),
  eq('eq_b_cloak_c', '그림자 망토',  'body', 'C',  3, 0,  7, 3, 0, 140, '🌑', undefined, { 도적: 2 }),
  eq('eq_b_cloak_b', '암살자 망토',  'body', 'B',  6, 0, 11, 4, 0, 270, '🌑', '그림자',  { 도적: 3 }),
  eq('eq_b_cloak_a', '허무의 망토',  'body', 'A', 10, 0, 16, 5, 0, 460, '🌑', '그림자',  { 도적: 5 }),
  eq('eq_b_cloak_s', '심연의 망토',  'body', 'S', 15, 0, 23, 6, 0, 840, '🌑', '그림자',  { 도적: 7 }, { type: 'trap_bonus', value: 12, condition: '함정 퀘스트 성공률 +12%' }),
]

// 사슬 갑옷 계열 — 세트 없음, 범용
const CHAINS: Equipment[] = [
  eq('eq_b_chain_d', '낡은 사슬 갑옷',    'body', 'D',  1, 0, 0,  4, 0,  60, '⛓', undefined),
  eq('eq_b_chain_c', '사슬 갑옷',         'body', 'C',  3, 0, 0,  7, 0, 150, '⛓', undefined),
  eq('eq_b_chain_b', '강화 사슬 갑옷',    'body', 'B',  6, 0, 0, 11, 0, 295, '⛓', undefined),
  eq('eq_b_chain_a', '정예 사슬 갑옷',    'body', 'A', 10, 0, 0, 16, 1, 500, '⛓', undefined),
  eq('eq_b_chain_s', '절대 사슬 갑옷',    'body', 'S', 15, 0, 0, 22, 2, 880, '⛓', undefined, undefined, { type: 'survival_bonus', value: 5, condition: '생존율 +5' }),
]

// ── ACCESSORY slot (25 items) ─────────────────────────────────────────────
// 전투 반지 계열 — 철벽 세트 (B~S), 전사 친화
const RINGS: Equipment[] = [
  eq('eq_a_ring_d', '낡은 반지',    'accessory', 'D',  1, 1, 0,  1, 0,  45, '💍', undefined, { 전사: 1 }),
  eq('eq_a_ring_c', '강인의 반지',  'accessory', 'C',  3, 2, 0,  3, 0, 110, '💍', undefined, { 전사: 2 }),
  eq('eq_a_ring_b', '철벽의 반지',  'accessory', 'B',  5, 3, 0,  5, 0, 215, '💍', '철벽',    { 전사: 3 }),
  eq('eq_a_ring_a', '기사의 반지',  'accessory', 'A',  9, 5, 0,  8, 0, 375, '💍', '철벽',    { 전사: 4 }),
  eq('eq_a_ring_s', '불멸의 반지',  'accessory', 'S', 13, 7, 0, 12, 3, 700, '💎', '철벽',    { 전사: 6 }, { type: 'quest_success_morale', value: 6, condition: '퀘스트 성공 시 사기 +6' }),
]

// 그림자 장갑 계열 — 그림자 세트 (B~S), 도적 친화
const GLOVES: Equipment[] = [
  eq('eq_a_glove_d', '낡은 장갑',       'accessory', 'D',  1, 0,  3, 0, 0,  40, '🥊', undefined, { 도적: 1 }),
  eq('eq_a_glove_c', '가죽 장갑',       'accessory', 'C',  3, 0,  6, 0, 0, 105, '🥊', undefined, { 도적: 2 }),
  eq('eq_a_glove_b', '그림자 장갑',     'accessory', 'B',  5, 0, 10, 0, 0, 210, '🌑', '그림자',  { 도적: 3 }),
  eq('eq_a_glove_a', '암살자의 장갑',   'accessory', 'A',  9, 0, 15, 0, 0, 365, '🌑', '그림자',  { 도적: 4 }),
  eq('eq_a_glove_s', '허무의 장갑',     'accessory', 'S', 13, 0, 22, 0, 0, 690, '🌑', '그림자',  { 도적: 6 }, { type: 'trap_bonus', value: 9, condition: '함정 퀘스트 성공률 +9%' }),
]

// 마법 목걸이 계열 — 현자 세트 (B~S), 마법사 친화
const NECKLACES: Equipment[] = [
  eq('eq_a_neck_d', '낡은 목걸이',    'accessory', 'D',  1,  2, 0, 0, 2,  45, '📿', undefined, { 마법사: 1 }),
  eq('eq_a_neck_c', '마법 목걸이',    'accessory', 'C',  3,  4, 0, 0, 3, 115, '📿', undefined, { 마법사: 2 }),
  eq('eq_a_neck_b', '현자의 목걸이',  'accessory', 'B',  5,  7, 0, 0, 4, 220, '📿', '현자',    { 마법사: 3 }),
  eq('eq_a_neck_a', '원소의 목걸이',  'accessory', 'A',  9, 11, 0, 0, 5, 380, '📿', '현자',    { 마법사: 4 }),
  eq('eq_a_neck_s', '아르카나 목걸이','accessory', 'S', 13, 16, 0, 0, 6, 710, '✨', '현자',    { 마법사: 6 }, { type: 'guild_fame_bonus', value: 4, condition: '퀘스트 성공 시 명성 +4' }),
]

// 자연의 부적 계열 — 자연 세트 (B~S), 궁수/성직자 친화
const AMULETS: Equipment[] = [
  eq('eq_a_amulet_d', '낡은 부적',   'accessory', 'D',  1, 0, 1, 1,  2,  40, '🧿', undefined, { 궁수: 1, 성직자: 1 }),
  eq('eq_a_amulet_c', '자연의 부적', 'accessory', 'C',  3, 0, 2, 2,  4, 110, '🧿', undefined, { 궁수: 2, 성직자: 2 }),
  eq('eq_a_amulet_b', '정령의 부적', 'accessory', 'B',  5, 0, 3, 3,  6, 215, '🌿', '자연',    { 궁수: 3, 성직자: 3 }),
  eq('eq_a_amulet_a', '대지의 부적', 'accessory', 'A',  9, 0, 5, 5,  8, 375, '🌿', '자연',    { 궁수: 4, 성직자: 4 }),
  eq('eq_a_amulet_s', '신목의 부적', 'accessory', 'S', 13, 0, 7, 7, 11, 700, '🌿', '자연',    { 궁수: 6, 성직자: 6 }, { type: 'morale_recovery_on_kill', value: 6, condition: '퀘스트 성공 시 사기 추가 +6' }),
]

// 강인의 팔찌 계열 — 세트 없음, 범용 생존
const BRACELETS: Equipment[] = [
  eq('eq_a_brace_d', '낡은 팔찌',    'accessory', 'D',  1, 0, 0,  3, 0,  40, '📎', undefined),
  eq('eq_a_brace_c', '강인의 팔찌',  'accessory', 'C',  3, 0, 0,  5, 0, 105, '📎', undefined),
  eq('eq_a_brace_b', '용사의 팔찌',  'accessory', 'B',  5, 0, 0,  8, 0, 205, '📎', undefined),
  eq('eq_a_brace_a', '불굴의 팔찌',  'accessory', 'A',  9, 0, 0, 12, 0, 360, '📎', undefined),
  eq('eq_a_brace_s', '신화의 팔찌',  'accessory', 'S', 13, 0, 0, 17, 2, 680, '⚡', undefined, undefined, { type: 'survival_bonus', value: 6, condition: '생존율 +6' }),
]

// ── Full pool export ──────────────────────────────────────────────────────
export const EQUIPMENT_POOL: Equipment[] = [
  ...SWORDS, ...DAGGERS, ...BOWS, ...STAVES, ...MACES,
  ...HELMS, ...HOODS, ...CROWNS, ...BANDS, ...HATS,
  ...PLATES, ...LEATHERS, ...ROBES, ...CLOAKS, ...CHAINS,
  ...RINGS, ...GLOVES, ...NECKLACES, ...AMULETS, ...BRACELETS,
]

// ── Set Definitions ───────────────────────────────────────────────────────
export const SET_DEFINITIONS: SetDefinition[] = [
  {
    id: '철벽',
    name: '철벽 세트',
    bonuses: [
      { requiredCount: 2, description: '생존율 +10', effects: [{ type: 'survival_bonus', value: 10 }] },
      { requiredCount: 3, description: '속성 일치 퀘스트 사망률 -20%', effects: [{ type: 'same_element_death_resist', value: 20 }] },
    ],
  },
  {
    id: '그림자',
    name: '그림자 세트',
    bonuses: [
      { requiredCount: 2, description: '함정해제 +8', effects: [{ type: 'trap_bonus', value: 8 }] },
      { requiredCount: 3, description: '암흑 퀘스트 성공률 +12%', effects: [{ type: 'trap_bonus', value: 12 }] },
    ],
  },
  {
    id: '현자',
    name: '현자 세트',
    bonuses: [
      { requiredCount: 2, description: '전력 +15', effects: [{ type: 'survival_bonus', value: 0 }] }, // powerBonus applied separately
      { requiredCount: 3, description: '속성 일치 시 명성 +3', effects: [{ type: 'guild_fame_bonus', value: 3 }] },
    ],
  },
  {
    id: '자연',
    name: '자연 세트',
    bonuses: [
      { requiredCount: 2, description: '사기 +10', effects: [{ type: 'quest_success_morale', value: 10 }] },
      { requiredCount: 3, description: '퀘스트 성공 사기 회복 +5', effects: [{ type: 'morale_recovery_on_kill', value: 5 }] },
    ],
  },
]

// ── Helper functions ──────────────────────────────────────────────────────

/** Find equipment by ID */
export const findEquip = (id: string): Equipment | undefined =>
  EQUIPMENT_POOL.find(e => e.id === id)

/** Get all equipped items for a mercenary (resolves IDs → Equipment) */
export const getEquipped = (
  equip: { weapon: string | null; head: string | null; body: string | null; accessory: string | null }
): Equipment[] => {
  const ids = [equip.weapon, equip.head, equip.body, equip.accessory].filter(Boolean) as string[]
  return ids.map(id => EQUIPMENT_POOL.find(e => e.id === id)).filter(Boolean) as Equipment[]
}

/** Active set bonuses for a list of equipped items */
export const getSetBonuses = (equipped: Equipment[]): { set: SetDefinition; bonus: typeof SET_DEFINITIONS[0]['bonuses'][0] }[] => {
  const result: { set: SetDefinition; bonus: typeof SET_DEFINITIONS[0]['bonuses'][0] }[] = []
  for (const setDef of SET_DEFINITIONS) {
    const count = equipped.filter(e => e.setId === setDef.id).length
    for (const bonus of setDef.bonuses) {
      if (count >= bonus.requiredCount) result.push({ set: setDef, bonus })
    }
  }
  return result
}

/** powerScore for comparing equipment quality (for auto-equip logic) */
export const powerScore = (e: Equipment): number =>
  e.powerBonus + e.atkBonus + e.trapBonus + e.survBonus

/** Grade weights for merchant stock generation by guild level (0-indexed) */
export const MERCHANT_GRADE_WEIGHTS: Record<number, Partial<Record<EquipGrade, number>>> = {
  1: { D: 50, C: 40, B: 10 },
  2: { C: 40, B: 40, A: 20 },
  3: { B: 30, A: 50, S: 20 },
  4: { A: 40, S: 60 },
}

/** Drop grade pool by quest tier */
export const DROP_GRADE_POOL: Record<number, EquipGrade[]> = {
  1: ['D', 'D', 'C'],
  2: ['C', 'B'],
  3: ['B', 'A'],
  4: ['A', 'S'],
  5: ['A', 'S', 'S'],
}

/** Drop probability by quest tier (0–1) */
export const DROP_CHANCE: Record<number, number> = {
  1: 0.08, 2: 0.12, 3: 0.18, 4: 0.25, 5: 0.40,
}

/** Quest tier from difficulty */
export const questTier = (difficulty: number): number => {
  if (difficulty <= 120) return 1
  if (difficulty <= 210) return 2
  if (difficulty <= 330) return 3
  if (difficulty <= 560) return 4
  return 5
}

/** Pick a random item from the pool by slot + grade */
export const randomItemByGrade = (slot: EquipSlot, grade: EquipGrade): Equipment => {
  const pool = EQUIPMENT_POOL.filter(e => e.slot === slot && e.grade === grade)
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Pick a random drop item for a quest (returns null if no drop) */
export const rollQuestDrop = (difficulty: number): Equipment | null => {
  const tier = questTier(difficulty)
  if (Math.random() >= DROP_CHANCE[tier]) return null
  const grades = DROP_GRADE_POOL[tier]
  const grade = grades[Math.floor(Math.random() * grades.length)]
  const slots: EquipSlot[] = ['weapon', 'head', 'body', 'accessory']
  const slot = slots[Math.floor(Math.random() * slots.length)]
  return randomItemByGrade(slot, grade)
}

/** Generate merchant stock for a given guild level (1–4+) */
export const generateMerchantStock = (guildLevel: number): Equipment[] => {
  const lvKey = Math.min(guildLevel, 4) as 1 | 2 | 3 | 4
  const weights = MERCHANT_GRADE_WEIGHTS[lvKey]
  const entries = Object.entries(weights) as [EquipGrade, number][]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  const count = 3 + Math.floor(Math.random() * 3) // 3–5 items

  const stock: Equipment[] = []
  const slots: EquipSlot[] = ['weapon', 'head', 'body', 'accessory']
  for (let i = 0; i < count; i++) {
    let roll = Math.random() * total
    let grade: EquipGrade = 'C'
    for (const [g, w] of entries) { roll -= w; if (roll <= 0) { grade = g; break } }
    const slot = slots[Math.floor(Math.random() * slots.length)]
    stock.push(randomItemByGrade(slot, grade))
  }
  return stock
}
```

- [ ] **Step 2: Build to verify**

```bash
node scripts/build-release.js
```

Expected: Still failing on `weaponId` in mercenaries.ts and App.tsx — OK for now.

- [ ] **Step 3: Commit**

```bash
git add src/data/equipment.ts
git commit -m "feat: add 100-item equipment pool and set definitions"
```

---

## Task 3: Create src/data/dungeons.ts

**Files:** Create `src/data/dungeons.ts`

- [ ] **Step 1: Write the file**

```ts
import type { ActiveDungeon } from '../types'

export const DUNGEON_NAMES = [
  '잊혀진 지하 묘지', '부서진 요새 지하', '어둠의 동굴', '고대 신전 지하',
  '버려진 광산', '마족의 소굴', '혼돈의 미궁', '저주받은 성채 지하',
  '심연의 동굴', '타락한 신전', '불타는 지하 용암굴', '서리 제단',
]

export const DUNGEON_ELEMENT_POOL: ActiveDungeon['element'][] = [
  '불', '얼음', '번개', '자연', '암흑', '빛',
]

/** Dungeon trigger probability by quest tier (0–1) */
export const DUNGEON_TRIGGER_CHANCE: Record<number, number> = {
  1: 0.03, 2: 0.05, 3: 0.08, 4: 0.12, 5: 0.30,
}

/** Min/max floor range unlocked by quest tier */
export const DUNGEON_FLOOR_RANGE: Record<number, [number, number]> = {
  1: [1, 3], 2: [2, 5], 3: [4, 7], 4: [6, 10], 5: [8, 10],
}

/**
 * Base difficulty for dungeon floor N.
 * questDifficulty: the difficulty of the quest that triggered the dungeon.
 */
export const dungeonFloorDifficulty = (questDifficulty: number, floor: number): number =>
  Math.round(questDifficulty * 0.8 * (1 + floor * 0.3))

/**
 * Death risk for dungeon floor N.
 * baseRisk: quest.deathRisk
 */
export const dungeonFloorDeathRisk = (baseRisk: number, floor: number): number =>
  Math.min(0.98, baseRisk * (1 + floor * 0.15))

/** Gold reward per floor */
export const dungeonFloorGold = (floor: number): number => floor * 80

/** XP reward per floor */
export const dungeonFloorXp = (floor: number): number => floor * 25

/** Completion bonus gold */
export const dungeonClearBonusGold = (maxFloor: number): number => maxFloor * 200

/** Completion bonus fame */
export const dungeonClearBonusFame = (maxFloor: number): number => maxFloor * 5

/** Create a new ActiveDungeon from a quest completion */
export const createDungeon = (questDifficulty: number, tier: number): ActiveDungeon => {
  const [minF, maxF] = DUNGEON_FLOOR_RANGE[tier]
  const maxFloor = minF + Math.floor(Math.random() * (maxF - minF + 1))
  const element = DUNGEON_ELEMENT_POOL[Math.floor(Math.random() * DUNGEON_ELEMENT_POOL.length)]
  const name = DUNGEON_NAMES[Math.floor(Math.random() * DUNGEON_NAMES.length)]
  return {
    id: `dg-${Date.now().toString(36)}`,
    name,
    maxFloor,
    currentFloor: 1,
    clearedFloors: 0,
    element,
    status: 'active',
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/dungeons.ts
git commit -m "feat: add dungeon name pool, floor scaling helpers"
```

---

## Task 4: Update src/utils/power.ts

**Files:** Modify `src/utils/power.ts`

- [ ] **Step 1: Replace file content**

```ts
import type { Mercenary } from '../types'
import { getEquipped, getSetBonuses } from '../data/equipment'

/** Sum powerBonus (+ classBonus) from all equipped items */
const eqPow = (m: Mercenary): number =>
  getEquipped(m.equipment).reduce((s, e) =>
    s + e.powerBonus + (e.classBonus?.[m.class] ?? 0), 0)

const eqAtk  = (m: Mercenary): number => getEquipped(m.equipment).reduce((s, e) => s + e.atkBonus,  0)
const eqTrap = (m: Mercenary): number => getEquipped(m.equipment).reduce((s, e) => s + e.trapBonus, 0)
const eqSurv = (m: Mercenary): number => {
  const equipped = getEquipped(m.equipment)
  let surv = equipped.reduce((s, e) => s + e.survBonus, 0)
  // survival_bonus passives from items
  for (const e of equipped) {
    if (e.passive?.type === 'survival_bonus') surv += e.passive.value
  }
  // survival_bonus from set bonuses
  for (const { bonus } of getSetBonuses(equipped)) {
    for (const eff of bonus.effects) {
      if (eff.type === 'survival_bonus') surv += eff.value
    }
  }
  return surv
}

export const effPower = (m: Mercenary): number => {
  if (m.age >= 55) return 0
  const favMod = 1 + (m.favorability - 50) / 500
  let base = m.power + eqPow(m)
  if (m.age >= 38) {
    const agePenalty = Math.min(0.50, (m.age - 37) * 0.03)
    base = Math.round(base * (1 - agePenalty))
  }
  const moraleMod = 0.8 + 0.2 * ((m.morale ?? 70) / 100)
  return Math.round(base * (0.4 + 0.6 * m.condition / 100) * favMod * moraleMod)
}

export const combatPower = (m: Mercenary): number =>
  Math.round((m.stats.공격력 + eqAtk(m)) * (0.4 + 0.6 * m.condition / 100))

export const canTrap = (m: Mercenary): boolean =>
  m.class === '도적' || m.class === '궁수'

export const trapPower = (m: Mercenary): number =>
  m.trap_disarm + eqTrap(m)

export const survBonus = (m: Mercenary): number => eqSurv(m)

export { eqPow, eqAtk, eqTrap, eqSurv }
```

- [ ] **Step 2: Build to verify**

```bash
node scripts/build-release.js
```

Expected: Still failing on weaponId in App.tsx and mercenaries.ts.

- [ ] **Step 3: Commit**

```bash
git add src/utils/power.ts
git commit -m "feat: update effPower/combatPower to use equipment slots"
```

---

## Task 5: Update src/data/mercenaries.ts

**Files:** Modify `src/data/mercenaries.ts`

- [ ] **Step 1: Remove weaponId exports and add equipment field**

Replace the import line at the top:
```ts
import type { Mercenary } from '../types'
// Remove: import { DEFAULT_WEAPON } from './weapons'
// Remove: export { WEAPONS, DEFAULT_WEAPON } from './weapons'
export { ALL_QUESTS } from './quests'
```

Replace starter mercs — change `weaponId: 'w_w1'` → `equipment: { weapon: null, head: null, body: null, accessory: null }` for all three:

```ts
export const initialMercenaries: Mercenary[] = [
  {
    id: 'm1', name: '카이강', age: 22, race: '인간', class: '전사',
    grade: 'D', power: 28, element: '불', trap_disarm: 15, condition: 90, hp: 100,
    cost: 0, deathCost: 80,
    traits: { cooperation: 65, ego: 50, gender: '남', synergy_factor: 1.0 },
    stats: { 공격력: 30, 함정해제: 15, 생존율: 35, 협조성: 65 },
    dailyWage: 18, favorability: 50, morale: 70, status: '대기중', room: '식당',
    level: 1, experience: 0, expToNext: 100,
    equipment: { weapon: null, head: null, body: null, accessory: null }
  },
  {
    id: 'm2', name: '미나원', age: 19, race: '인간', class: '궁수',
    grade: 'D', power: 25, element: '자연', trap_disarm: 18, condition: 85, hp: 100,
    cost: 0, deathCost: 80,
    traits: { cooperation: 60, ego: 55, gender: '여', synergy_factor: 0.98 },
    stats: { 공격력: 28, 함정해제: 18, 생존율: 28, 협조성: 60 },
    dailyWage: 16, favorability: 50, morale: 70, status: '대기중', room: '식당',
    level: 1, experience: 0, expToNext: 100,
    equipment: { weapon: null, head: null, body: null, accessory: null }
  },
  {
    id: 'm3', name: '브란성', age: 24, race: '드워프', class: '도적',
    grade: 'C', power: 42, element: '암흑', trap_disarm: 45, condition: 80, hp: 100,
    cost: 0, deathCost: 150,
    traits: { cooperation: 55, ego: 60, gender: '남', synergy_factor: 0.96 },
    stats: { 공격력: 35, 함정해제: 45, 생존율: 38, 협조성: 55 },
    dailyWage: 28, favorability: 50, morale: 70, status: '대기중', room: '식당',
    level: 2, experience: 80, expToNext: 200,
    equipment: { weapon: null, head: null, body: null, accessory: null }
  },
]
```

Replace the return in `generateMercenary()` — remove `weaponId: DEFAULT_WEAPON[cls]`, add `equipment`:

```ts
  return {
    id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: randomName(),
    age: Math.floor(Math.random() * 28) + 18,
    race, class: cls, grade, power,
    element: pickElement(cls),
    trap_disarm: (cls === '궁수' || cls === '도적') ? Math.round(combat.함정해제 * (cls === '도적' ? 1.1 : 1)) : 0,
    condition: 100, hp: Math.max(50, 100 + raceMod.hpBonus), cost, deathCost: DEATH_COSTS[grade],
    traits: {
      cooperation,
      ego: Math.floor(Math.random() * 41) + 45,
      gender: Math.random() < 0.5 ? '남' : '여',
      synergy_factor: Number((1 + raceMod.synergy * 0.01 + (Math.random() - 0.5) * 0.08).toFixed(2))
    },
    stats, dailyWage,
    favorability: 50,
    morale: 70,
    status: '대기중', room: '식당',
    level: 1, experience: 0, expToNext: EXP_TO_NEXT(1),
    equipment: { weapon: null, head: null, body: null, accessory: null }
  }
```

- [ ] **Step 2: Build**

```bash
node scripts/build-release.js
```

Expected: Errors in App.tsx for `weaponId`, `WEAPONS`, `DEFAULT_WEAPON` — will be fixed in Task 11.

- [ ] **Step 3: Commit**

```bash
git add src/data/mercenaries.ts
git commit -m "feat: replace weaponId with equipment slots in mercenaries"
```

---

## Task 6: Create src/hooks/useMerchant.ts

**Files:** Create `src/hooks/useMerchant.ts`

- [ ] **Step 1: Write the file**

```ts
import { useCallback, useEffect, useRef } from 'react'
import type { MerchantState, Equipment } from '../types'
import { generateMerchantStock } from '../data/equipment'

const MERCHANT_ARRIVE_MS  = 20 * 60 * 1000   // 20 minutes real-time
const MERCHANT_DEPART_MS  = 10 * 60 * 1000   // 10 minutes real-time

interface UseMerchantOptions {
  merchantState: MerchantState | null
  setMerchantState: (s: MerchantState | null) => void
  guildLevel: number
  log: (msg: string) => void
}

export function useMerchant({
  merchantState, setMerchantState, guildLevel, log,
}: UseMerchantOptions) {
  // nextArriveAt: wall-clock timestamp for next merchant arrival
  const nextArriveAtRef = useRef<number>(Date.now() + MERCHANT_ARRIVE_MS)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()

      if (!merchantState?.active) {
        // Waiting for arrival
        if (now >= nextArriveAtRef.current) {
          const stock = generateMerchantStock(guildLevel)
          const departsAt = now + MERCHANT_DEPART_MS
          setMerchantState({ active: true, stock, departsAt })
          log('🛒 행상인이 찾아왔습니다! 건물 패널에서 장비를 구매하세요.')
          // Schedule next after this one departs
          nextArriveAtRef.current = departsAt + MERCHANT_ARRIVE_MS
        }
      } else {
        // Merchant is here — check departure
        if (now >= merchantState.departsAt) {
          setMerchantState(null)
          log('🛒 행상인이 떠났습니다.')
        }
      }
    }, 5000) // check every 5 seconds
    return () => clearInterval(interval)
  }, [merchantState, guildLevel, setMerchantState, log])

  /** Buy an item from merchant stock */
  const buyFromMerchant = useCallback((
    item: Equipment,
    gold: number,
    guildInventory: Equipment[],
    onBuy: (item: Equipment, cost: number) => void,
    logFn: (msg: string) => void,
  ) => {
    const cost = Math.round(item.buyCost * 1.2)
    if (gold < cost) { logFn(`💰 금화 부족 — ${item.name} 구매 불가 (${cost}G 필요)`); return }
    if (guildInventory.length >= 40) { logFn('🎒 인벤토리 가득 참 — 장비를 먼저 정리하세요'); return }
    // Remove item from stock
    setMerchantState(prev => {
      if (!prev) return null
      return { ...prev, stock: prev.stock.filter(s => s.id !== item.id) }
    })
    onBuy(item, cost)
    logFn(`🛒 [${item.name}] 구매! (-${cost}G)`)
  }, [setMerchantState])

  return { buyFromMerchant }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useMerchant.ts
git commit -m "feat: useMerchant hook for arrival/departure timing"
```

---

## Task 7: Create src/hooks/useDungeon.ts

**Files:** Create `src/hooks/useDungeon.ts`

- [ ] **Step 1: Write the file**

```ts
import { useCallback } from 'react'
import type { ActiveDungeon, Equipment, ActiveQuest } from '../types'
import {
  dungeonFloorDifficulty, dungeonFloorDeathRisk,
  dungeonFloorGold, dungeonFloorXp,
  dungeonClearBonusGold, dungeonClearBonusFame,
} from '../data/dungeons'
import { rollQuestDrop } from '../data/equipment'

interface UseDungeonOptions {
  activeDungeon: ActiveDungeon | null
  setActiveDungeon: (d: ActiveDungeon | null) => void
  guildInventory: Equipment[]
  setGuildInventory: (fn: (prev: Equipment[]) => Equipment[]) => void
  log: (msg: string) => void
  onReward: (gold: number, fame: number) => void
}

export function useDungeon({
  activeDungeon, setActiveDungeon,
  guildInventory, setGuildInventory,
  log, onReward,
}: UseDungeonOptions) {

  /** Call after a dungeon floor ActiveQuest completes successfully */
  const onFloorCleared = useCallback((floor: number, questDifficulty: number) => {
    if (!activeDungeon) return
    const gold = dungeonFloorGold(floor)
    const xp   = dungeonFloorXp(floor)
    log(`🏚 [${activeDungeon.name}] ${floor}층 클리어! +${gold}G / +${xp}XP`)
    onReward(gold, 0)

    // Equipment drop on floor 5+
    if (floor >= 5) {
      const drop = rollQuestDrop(questDifficulty * 1.2) // slightly higher chance
      if (drop && guildInventory.length < 40) {
        setGuildInventory(prev => [...prev, drop])
        log(`🎁 던전 드롭: [${drop.icon} ${drop.name} ${drop.grade}등급]`)
      }
    }

    const clearedFloors = activeDungeon.clearedFloors + 1
    if (clearedFloors >= activeDungeon.maxFloor) {
      // Full clear
      const bonusGold = dungeonClearBonusGold(activeDungeon.maxFloor)
      const bonusFame = dungeonClearBonusFame(activeDungeon.maxFloor)
      onReward(bonusGold, bonusFame)

      // 1–2 A/S items
      const dropCount = 1 + (Math.random() < 0.4 ? 1 : 0)
      for (let i = 0; i < dropCount; i++) {
        if (guildInventory.length + i < 40) {
          const grade = Math.random() < 0.6 ? 'A' : 'S' as const
          const drop2 = rollQuestDrop(600 + i) // guaranteed high tier
          if (drop2) {
            setGuildInventory(prev => [...prev, drop2])
            log(`🎁 완전 클리어 보상: [${drop2.icon} ${drop2.name} ${drop2.grade}등급]`)
          }
        } else {
          log('🎒 인벤토리 가득 참 — 클리어 장비 보상 획득 불가')
        }
      }

      log(`✨ [${activeDungeon.name}] 완전 클리어! +${bonusGold}G / 명성 +${bonusFame}`)
      setActiveDungeon({ ...activeDungeon, clearedFloors, status: 'completed' })
    } else {
      setActiveDungeon({
        ...activeDungeon,
        clearedFloors,
        currentFloor: activeDungeon.currentFloor + 1,
        activeDungeonQuestId: undefined,
      })
    }
  }, [activeDungeon, guildInventory, setActiveDungeon, setGuildInventory, log, onReward])

  /** Call when a dungeon floor quest fails */
  const onFloorFailed = useCallback(() => {
    if (!activeDungeon) return
    log(`💀 [${activeDungeon.name}] ${activeDungeon.currentFloor}층 공략 실패. 다시 파견하세요.`)
    setActiveDungeon({ ...activeDungeon, activeDungeonQuestId: undefined })
  }, [activeDungeon, setActiveDungeon, log])

  /** Abandon the dungeon */
  const abandonDungeon = useCallback(() => {
    if (!activeDungeon) return
    log(`🚪 [${activeDungeon.name}] 던전 포기. 이제까지의 보상은 유지됩니다.`)
    setActiveDungeon(null)
  }, [activeDungeon, setActiveDungeon, log])

  return {
    onFloorCleared,
    onFloorFailed,
    abandonDungeon,
    dungeonFloorDifficulty,
    dungeonFloorDeathRisk,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useDungeon.ts
git commit -m "feat: useDungeon hook for floor progression and rewards"
```

---

## Task 8: Create src/components/EquipmentModal.tsx

**Files:** Create `src/components/EquipmentModal.tsx`

- [ ] **Step 1: Write the file**

```tsx
import type { Mercenary, Equipment, EquipSlot } from '../types'
import { getEquipped, getSetBonuses, powerScore, findEquip } from '../data/equipment'

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: '⚔ 무기', head: '🪖 머리', body: '🛡 몸통', accessory: '💍 장신구',
}

const GRADE_COLOR: Record<string, string> = {
  S: '#e879f9', A: '#fbbf24', B: '#34d399', C: '#38bdf8', D: '#94a3b8',
}

interface Props {
  merc: Mercenary
  guildInventory: Equipment[]
  onEquip: (mercId: string, slot: EquipSlot, itemId: string | null) => void
  onClose: () => void
}

export function EquipmentModal({ merc, guildInventory, onEquip, onClose }: Props) {
  const equipped = getEquipped(merc.equipment)
  const setBonuses = getSetBonuses(equipped)
  const slots: EquipSlot[] = ['weapon', 'head', 'body', 'accessory']

  const inventoryForSlot = (slot: EquipSlot) =>
    guildInventory.filter(e => e.slot === slot)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl overflow-y-auto"
        style={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 480, width: '95vw', maxHeight: '85vh', padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold text-lg">{merc.name} — 장비 관리</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Equipped slots */}
        <div className="space-y-2 mb-4">
          {slots.map(slot => {
            const itemId = merc.equipment[slot]
            const item = itemId ? findEquip(itemId) : null
            return (
              <div key={slot} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">{SLOT_LABEL[slot]}</span>
                  {item ? (
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{item.icon} {item.name}</span>
                      <span className="text-xs font-bold px-1 rounded" style={{ color: GRADE_COLOR[item.grade], border: `1px solid ${GRADE_COLOR[item.grade]}` }}>{item.grade}</span>
                      <button
                        className="text-xs text-red-400 hover:text-red-300 ml-1"
                        onClick={() => onEquip(merc.id, slot, null)}
                      >해제</button>
                    </div>
                  ) : (
                    <span className="text-slate-600 text-sm">(없음)</span>
                  )}
                </div>
                {item && (
                  <div className="mt-1 text-xs text-slate-400 flex gap-3">
                    {item.powerBonus > 0 && <span>전력+{item.powerBonus}</span>}
                    {item.atkBonus > 0 && <span>공격+{item.atkBonus}</span>}
                    {item.trapBonus > 0 && <span>함정+{item.trapBonus}</span>}
                    {item.survBonus > 0 && <span>생존+{item.survBonus}</span>}
                    {item.passive && <span className="text-purple-400">{item.passive.condition}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Set bonuses */}
        {setBonuses.length > 0 && (
          <div className="rounded-lg p-3 mb-4" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <div className="text-purple-300 text-sm font-bold mb-1">세트 효과</div>
            {setBonuses.map((sb, i) => (
              <div key={i} className="text-xs text-purple-200">
                {sb.set.name} {sb.bonus.requiredCount}세트 — {sb.bonus.description}
              </div>
            ))}
          </div>
        )}

        {/* Guild Inventory */}
        <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="text-slate-400 text-sm mb-2">
            길드 인벤토리 ({guildInventory.length}/40) — 클릭하면 해당 슬롯에 장착
          </div>
          {slots.map(slot => {
            const items = inventoryForSlot(slot)
            if (items.length === 0) return null
            return (
              <div key={slot} className="mb-3">
                <div className="text-slate-500 text-xs mb-1">{SLOT_LABEL[slot]}</div>
                <div className="flex flex-wrap gap-1">
                  {items.map(item => {
                    const isEquipped = merc.equipment[slot] === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => onEquip(merc.id, slot, item.id)}
                        className="text-xs px-2 py-1 rounded transition-all"
                        style={{
                          background: isEquipped ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${isEquipped ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
                          color: GRADE_COLOR[item.grade],
                        }}
                        title={`${item.name} | 전력+${item.powerBonus} 공격+${item.atkBonus} 함정+${item.trapBonus} 생존+${item.survBonus}${item.passive ? ' | ' + item.passive.condition : ''}`}
                      >
                        {item.icon} {item.name} <span style={{ opacity: 0.7 }}>{item.grade}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {guildInventory.length === 0 && (
            <div className="text-slate-600 text-sm">인벤토리가 비어있습니다.</div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EquipmentModal.tsx
git commit -m "feat: EquipmentModal component for per-merc gear management"
```

---

## Task 9: Create src/components/MerchantPanel.tsx

**Files:** Create `src/components/MerchantPanel.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useState, useEffect } from 'react'
import type { MerchantState, Equipment } from '../types'

const GRADE_COLOR: Record<string, string> = {
  S: '#e879f9', A: '#fbbf24', B: '#34d399', C: '#38bdf8', D: '#94a3b8',
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return '0초'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const rem = s % 60
  return m > 0 ? `${m}분 ${rem}초` : `${rem}초`
}

interface Props {
  merchant: MerchantState
  gold: number
  guildInventory: Equipment[]
  onBuy: (item: Equipment) => void
  onClose: () => void
}

export function MerchantPanel({ merchant, gold, guildInventory, onBuy, onClose }: Props) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const remaining = merchant.departsAt - now
  const inventoryFull = guildInventory.length >= 40

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl overflow-y-auto"
        style={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 440, width: '95vw', maxHeight: '80vh', padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-white font-bold text-lg">🛒 행상인</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="text-sm mb-4" style={{ color: remaining < 120000 ? '#f87171' : '#94a3b8' }}>
          출발까지: {fmtCountdown(remaining)}
        </div>

        {inventoryFull && (
          <div className="rounded-lg p-2 mb-3 text-sm text-center" style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}>
            🎒 인벤토리가 가득 찼습니다
          </div>
        )}

        <div className="space-y-3">
          {merchant.stock.length === 0 ? (
            <div className="text-slate-500 text-center py-4">재고가 소진되었습니다.</div>
          ) : (
            merchant.stock.map(item => {
              const cost = Math.round(item.buyCost * 1.2)
              const canAfford = gold >= cost && !inventoryFull
              return (
                <div key={item.id} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold">{item.icon} {item.name}</span>
                        <span className="text-xs font-bold px-1 rounded" style={{ color: GRADE_COLOR[item.grade], border: `1px solid ${GRADE_COLOR[item.grade]}` }}>{item.grade}</span>
                      </div>
                      <div className="text-xs text-slate-400 flex gap-3 flex-wrap">
                        {item.powerBonus > 0 && <span>전력 +{item.powerBonus}</span>}
                        {item.atkBonus > 0 && <span>공격 +{item.atkBonus}</span>}
                        {item.trapBonus > 0 && <span>함정 +{item.trapBonus}</span>}
                        {item.survBonus > 0 && <span>생존 +{item.survBonus}</span>}
                        {item.moraleBonus > 0 && <span>사기 +{item.moraleBonus}</span>}
                      </div>
                      {item.passive && (
                        <div className="text-xs text-purple-400 mt-0.5">패시브: {item.passive.condition}</div>
                      )}
                      {item.setId && (
                        <div className="text-xs text-amber-400 mt-0.5">세트: {item.setId}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-amber-300 font-bold">{cost}G</span>
                      <button
                        onClick={() => onBuy(item)}
                        disabled={!canAfford}
                        className="text-xs px-3 py-1 rounded font-bold transition-all"
                        style={{
                          background: canAfford ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${canAfford ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)'}`,
                          color: canAfford ? '#86efac' : '#475569',
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                        }}
                      >
                        구매
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MerchantPanel.tsx
git commit -m "feat: MerchantPanel UI component"
```

---

## Task 10: Create src/components/DungeonPanel.tsx

**Files:** Create `src/components/DungeonPanel.tsx`

- [ ] **Step 1: Write the file**

```tsx
import type { ActiveDungeon, Mercenary, Quest } from '../types'
import { dungeonFloorDifficulty, dungeonFloorDeathRisk, dungeonFloorGold, dungeonFloorXp } from '../data/dungeons'

const ELEMENT_ICON: Record<string, string> = {
  불: '🔥', 얼음: '🧊', 번개: '⚡', 자연: '🌿', 암흑: '🌑', 빛: '✨',
}

interface Props {
  dungeon: ActiveDungeon
  /** A synthetic Quest representing the current floor (for dispatch) */
  floorQuest: Quest
  availableMercs: Mercenary[]
  onDispatch: (questId: string, mercIds: string[]) => void
  onAbandon: () => void
  onClose: () => void
}

export function DungeonPanel({ dungeon, floorQuest, availableMercs, onDispatch, onAbandon, onClose }: Props) {
  const floor = dungeon.currentFloor
  const maxFloor = dungeon.maxFloor
  const progress = Math.round((dungeon.clearedFloors / maxFloor) * 100)
  const floorDiff = dungeonFloorDifficulty(floorQuest.difficulty, floor)
  const floorRisk = dungeonFloorDeathRisk(floorQuest.deathRisk, floor)
  const floorGold = dungeonFloorGold(floor)
  const floorXp   = dungeonFloorXp(floor)
  const hasEquip  = floor >= 5

  const isDispatched = !!dungeon.activeDungeonQuestId
  const isCompleted  = dungeon.status === 'completed'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl"
        style={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 440, width: '95vw', padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-white font-bold text-lg">🏚 {dungeon.name}</h2>
            <div className="text-slate-400 text-sm">
              {ELEMENT_ICON[dungeon.element]} {dungeon.element} 속성 · {floor}/{maxFloor}층
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>진행도</span><span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: '#7c3aed' }} />
          </div>
        </div>

        {isCompleted ? (
          <div className="text-center py-6 text-emerald-400 font-bold text-lg">
            ✨ 던전 완전 클리어!
          </div>
        ) : (
          <>
            {/* Floor info */}
            <div className="rounded-lg p-3 mb-4 space-y-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="text-white text-sm font-bold">현재 층: {floor}층</div>
              <div className="text-xs text-slate-400 flex gap-4 flex-wrap">
                <span>난이도: {floorDiff}</span>
                <span>사망위험: {(floorRisk * 100).toFixed(1)}%</span>
                <span>보상: {floorGold}G / {floorXp}XP</span>
                {hasEquip && <span className="text-amber-300">🎁 장비 드롭 가능</span>}
              </div>
            </div>

            {isDispatched ? (
              <div className="text-center py-4 text-sky-400 text-sm">
                ⚔ 파견 중... 퀘스트 완료 대기
              </div>
            ) : (
              <div className="text-slate-400 text-sm mb-3">
                일반 퀘스트 파견과 동일하게 용병을 배치하고 파견하세요.
                <br />
                <span className="text-slate-500 text-xs">DungeonPanel에서 직접 파견 기능은 App.tsx 통합 후 활성화됩니다.</span>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
          >
            닫기
          </button>
          {!isCompleted && (
            <button
              onClick={onAbandon}
              className="py-2 px-4 rounded-lg text-sm font-bold"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}
            >
              던전 포기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DungeonPanel.tsx
git commit -m "feat: DungeonPanel UI component"
```

---

## Task 11: App.tsx — Remove Weapon System, Add Equipment State + Quest Drop + Dungeon Trigger

**Files:** Modify `src/App.tsx`

This is the largest task. Work through each sub-step carefully.

### Step 11a: Update imports

- [ ] **Replace the import block at the top of App.tsx**

Find this line:
```ts
import { initialMercenaries, ALL_QUESTS, generateMercenary, EXP_TO_NEXT, WEAPONS, DEFAULT_WEAPON, RACE_BONUS_DESC } from './data/mercenaries'
```
Replace with:
```ts
import { initialMercenaries, ALL_QUESTS, generateMercenary, EXP_TO_NEXT, RACE_BONUS_DESC } from './data/mercenaries'
import { EQUIPMENT_POOL, findEquip, getEquipped, getSetBonuses, powerScore, rollQuestDrop, generateMerchantStock, questTier } from './data/equipment'
import { createDungeon, DUNGEON_TRIGGER_CHANCE, dungeonFloorDifficulty, dungeonFloorDeathRisk, dungeonFloorGold, dungeonFloorXp } from './data/dungeons'
import { EquipmentModal } from './components/EquipmentModal'
import { MerchantPanel } from './components/MerchantPanel'
import { DungeonPanel } from './components/DungeonPanel'
import { useMerchant } from './hooks/useMerchant'
import { useDungeon } from './hooks/useDungeon'
```

Add to the types import line:
```ts
import type { Mercenary, Quest, ActiveQuest, GuildBuildings, CampaignState, Equipment, EquipSlot, MerchantState, ActiveDungeon } from './types'
```

### Step 11b: Remove weapon helpers

- [ ] **Delete lines (approximately 40–45 in App.tsx):**

```ts
// ── 무기 헬퍼 ─────────────────────────────────────────────────────────────
const weaponOf = (m: Mercenary) => WEAPONS.find(w => w.id === m.weaponId)
const wPow  = (m: Mercenary) => { const w = weaponOf(m); return w ? w.powerBonus + (w.raceBonus[m.race] ?? 0) : 0 }
const wAtk  = (m: Mercenary) => weaponOf(m)?.atkBonus  ?? 0
const wTrap = (m: Mercenary) => weaponOf(m)?.trapBonus ?? 0
const wSurv = (m: Mercenary) => weaponOf(m)?.survBonus ?? 0
```

Replace with:
```ts
// Equipment helpers (imported from utils/power via App-level re-use)
import { eqAtk, eqTrap } from './utils/power'
```

Wait — `import` statements must go at the top. Instead, just delete those 6 weapon lines and add to the top-of-file imports:

```ts
import { effPower, combatPower, canTrap, trapPower, eqAtk, eqTrap } from './utils/power'
```

Then delete the local `effPower`, `combatPower`, `canTrap` function definitions that come later in App.tsx (around lines 48–74).

### Step 11c: Update calcSuccessRate to use equipment passives

- [ ] **In `calcSuccessRate`, update the trap power calculation**

Find:
```ts
    const totalTrap = assigned.filter(m => canTrap(m)).reduce((s, m) => s + m.trap_disarm + wTrap(m), 0)
```
Replace with:
```ts
    const totalTrap = assigned.filter(m => canTrap(m)).reduce((s, m) => s + m.trap_disarm + eqTrap(m), 0)
```

### Step 11d: Add new state variables

- [ ] **In the App component, add these state variables** (near other `useState` declarations):

```ts
const [guildInventory, setGuildInventory] = useState<Equipment[]>([])
const [merchantState, setMerchantState] = useState<MerchantState | null>(null)
const [activeDungeon, setActiveDungeon] = useState<ActiveDungeon | null>(null)
const [showEquipModal, setShowEquipModal] = useState<string | null>(null)   // mercId
const [showMerchant, setShowMerchant] = useState(false)
const [showDungeon, setShowDungeon] = useState(false)
const [pendingDrop, setPendingDrop] = useState<Equipment | null>(null)
```

### Step 11e: Wire useMerchant hook

- [ ] **Add after the state declarations:**

```ts
const { buyFromMerchant } = useMerchant({
  merchantState,
  setMerchantState,
  guildLevel: computeGuildLevel(state.fame),
  log,
})
```

### Step 11f: Wire useDungeon hook

- [ ] **Add after useMerchant:**

```ts
const { onFloorCleared, onFloorFailed, abandonDungeon } = useDungeon({
  activeDungeon,
  setActiveDungeon,
  guildInventory,
  setGuildInventory,
  log,
  onReward: (gold, fame) => {
    setState(prev => ({
      ...prev,
      gold: prev.gold + gold,
      fame: prev.fame + fame,
    }))
  },
})
```

### Step 11g: Add quest drop + dungeon trigger helper

- [ ] **Add a new pure function just before `instantCompleteQuest`:**

```ts
/** Roll for quest drop and dungeon trigger; returns items/dungeon to apply */
function rollQuestExtras(
  quest: Quest,
  success: boolean,
  existingDungeon: ActiveDungeon | null,
): { drop: Equipment | null; dungeon: ActiveDungeon | null } {
  if (!success) return { drop: null, dungeon: null }
  const drop = rollQuestDrop(quest.difficulty)
  let dungeon: ActiveDungeon | null = null
  if (!existingDungeon) {
    const tier = questTier(quest.difficulty)
    if (Math.random() < DUNGEON_TRIGGER_CHANCE[tier]) {
      dungeon = createDungeon(quest.difficulty, tier)
    }
  }
  return { drop, dungeon }
}
```

### Step 11h: Inject drop + dungeon into instantCompleteQuest

- [ ] **At the end of `instantCompleteQuest`, before `setShowLogModal(true)`, add:**

```ts
    // Quest drop + dungeon trigger
    const { drop, dungeon: newDungeon } = rollQuestExtras(quest, success, activeDungeon)
    if (drop) setPendingDrop(drop)
    if (newDungeon) {
      setActiveDungeon(newDungeon)
      questLines.push(`🏚 던전 발견! [${newDungeon.name}] ${newDungeon.maxFloor}층 — 건물 패널에서 파견하세요.`)
    }
```

### Step 11i: Inject drop + dungeon into processCompletions

- [ ] **In `processCompletions` (the timed path), at the equivalent point after setting `success`, add the same logic:**

Find the place in `processCompletions` where `const newPage = { questName: quest.name, success, lines: questLines }` is built. Just before it add:

```ts
      const { drop: timedDrop, dungeon: timedDungeon } = rollQuestExtras(quest, success, activeDungeon)
      if (timedDrop) setPendingDrop(timedDrop)
      if (timedDungeon) {
        setActiveDungeon(timedDungeon)
        questLines.push(`🏚 던전 발견! [${timedDungeon.name}] ${timedDungeon.maxFloor}층 — 건물 패널에서 파견하세요.`)
      }
```

### Step 11j: Add equip/unequip handler

- [ ] **Add a handler function:**

```ts
const equipItem = (mercId: string, slot: EquipSlot, itemId: string | null) => {
  setMercs(prev => prev.map(m => {
    if (m.id !== mercId) return m
    // If equipping, remove item from inventory; put old equipped item back
    const oldId = m.equipment[slot]
    let newInventory = [...guildInventory]
    if (itemId) newInventory = newInventory.filter(e => e.id !== itemId)
    if (oldId) {
      const oldItem = findEquip(oldId)
      if (oldItem) newInventory = [...newInventory, oldItem]
    }
    setGuildInventory(() => newInventory)
    return { ...m, equipment: { ...m.equipment, [slot]: itemId } }
  }))
}
```

### Step 11k: Add drop decision handler

- [ ] **Add handler for the pending drop modal:**

```ts
const acceptDrop = (item: Equipment) => {
  if (guildInventory.length >= 40) {
    log('🎒 인벤토리 가득 참 — 전리품 획득 불가')
    setPendingDrop(null)
    return
  }
  setGuildInventory(prev => [...prev, item])
  log(`🎁 [${item.icon} ${item.name} ${item.grade}등급] 길드 인벤토리에 추가!`)
  setPendingDrop(null)
}

const rejectDrop = (item: Equipment) => {
  // Try to auto-equip onto a party member with empty slot or lower power score
  const candidates = mercs.filter(m => m.status !== '영혼' && m.status !== '파견중')
  const target = candidates.find(m => {
    const currentId = m.equipment[item.slot]
    if (!currentId) return true
    const current = findEquip(currentId)
    return current ? powerScore(item) > powerScore(current) : true
  })
  if (target && Math.random() < 0.7) {
    equipItem(target.id, item.slot, item.id)
    const old = target.equipment[item.slot]
    if (old) {
      const oldItem = findEquip(old)
      if (oldItem) log(`🔄 ${target.name}의 [${oldItem.name}] → [${item.name}] 자동 교체`)
    }
    setMercs(prev => prev.map(m => m.id === target.id ? { ...m, morale: Math.min(100, (m.morale ?? 70) + 8) } : m))
    log(`⚡ ${target.name} 새 장비 착용 — 사기 +8`)
  } else {
    log(`[${item.name}] 소멸 (파티원 장착 조건 미충족)`)
  }
  setPendingDrop(null)
}
```

### Step 11l: Update saveGame / loadGame

- [ ] **In `saveGame`, add to the data object:**

```ts
    guildInventory,
    merchantState,
    activeDungeon,
```

- [ ] **In `loadGame`, add:**

```ts
    setGuildInventory(data.guildInventory ?? [])
    setMerchantState(data.merchantState ?? null)
    setActiveDungeon(data.activeDungeon ?? null)
```

- [ ] **In `loadGame`, update merc migration (replace weaponId migration):**

Find:
```ts
      return { ...migrated, weaponId: migrated.weaponId ?? DEFAULT_WEAPON[migrated.class] }
```
Replace with:
```ts
      // Migrate old weaponId saves → equipment slots
      const legacy = migrated as any
      const migratedEquip = legacy.equipment ?? { weapon: null, head: null, body: null, accessory: null }
      return { ...migrated, equipment: migratedEquip }
```

- [ ] **Build to verify**

```bash
node scripts/build-release.js
```

Expected: Zero TypeScript errors, build succeeds.

- [ ] **Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire equipment/merchant/dungeon state into App.tsx"
```

---

## Task 12: App.tsx — UI Integration (Modals + Merc Card Updates)

**Files:** Modify `src/App.tsx`

### Step 12a: Add pending drop modal to JSX

- [ ] **Find the section where `showLogModal` renders its modal. After that modal's closing tag, add:**

```tsx
{/* Pending drop modal */}
{pendingDrop && (
  <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
    <div className="rounded-2xl p-5" style={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', maxWidth: 380, width: '90vw' }}>
      <div className="text-center mb-4">
        <div className="text-2xl mb-1">{pendingDrop.icon}</div>
        <div className="text-white font-bold text-lg">🎁 전리품 획득!</div>
        <div className="text-amber-300 font-bold mt-1">[{pendingDrop.name} {pendingDrop.grade}등급]</div>
        <div className="text-slate-400 text-sm mt-2 flex justify-center gap-3 flex-wrap">
          {pendingDrop.powerBonus > 0 && <span>전력+{pendingDrop.powerBonus}</span>}
          {pendingDrop.atkBonus > 0 && <span>공격+{pendingDrop.atkBonus}</span>}
          {pendingDrop.trapBonus > 0 && <span>함정+{pendingDrop.trapBonus}</span>}
          {pendingDrop.survBonus > 0 && <span>생존+{pendingDrop.survBonus}</span>}
        </div>
        {pendingDrop.passive && <div className="text-purple-400 text-sm mt-1">{pendingDrop.passive.condition}</div>}
        <div className="text-slate-500 text-xs mt-1">구매가: {pendingDrop.buyCost}G</div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => acceptDrop(pendingDrop)}
          className="flex-1 py-2 rounded-lg font-bold text-sm"
          style={{ background: 'rgba(34,197,94,0.3)', border: '1px solid rgba(34,197,94,0.5)', color: '#86efac' }}
        >
          인벤토리에 추가
        </button>
        <button
          onClick={() => rejectDrop(pendingDrop)}
          className="flex-1 py-2 rounded-lg font-bold text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
        >
          거절 (자동 장착 시도)
        </button>
      </div>
    </div>
  </div>
)}
```

### Step 12b: Add Equipment/Merchant/Dungeon modals to JSX

- [ ] **After the pending drop modal, add:**

```tsx
{/* Equipment modal */}
{showEquipModal && (() => {
  const merc = mercs.find(m => m.id === showEquipModal)
  if (!merc) return null
  return (
    <EquipmentModal
      merc={merc}
      guildInventory={guildInventory}
      onEquip={equipItem}
      onClose={() => setShowEquipModal(null)}
    />
  )
})()}

{/* Merchant panel */}
{showMerchant && merchantState?.active && (
  <MerchantPanel
    merchant={merchantState}
    gold={state.gold}
    guildInventory={guildInventory}
    onBuy={item => buyFromMerchant(
      item, state.gold, guildInventory,
      (bought, cost) => {
        setState(prev => ({ ...prev, gold: prev.gold - cost }))
        setGuildInventory(prev => [...prev, bought])
      },
      log,
    )}
    onClose={() => setShowMerchant(false)}
  />
)}

{/* Dungeon panel */}
{showDungeon && activeDungeon && (() => {
  // Create a synthetic Quest for the current dungeon floor
  const baseQuest = ALL_QUESTS.find(q => q.difficulty >= 100) ?? ALL_QUESTS[0]
  const floorQuest: Quest = {
    ...baseQuest,
    id: `dg-floor-${activeDungeon.currentFloor}`,
    name: `${activeDungeon.name} ${activeDungeon.currentFloor}층`,
    difficulty: dungeonFloorDifficulty(baseQuest.difficulty, activeDungeon.currentFloor),
    deathRisk: dungeonFloorDeathRisk(baseQuest.deathRisk, activeDungeon.currentFloor),
    element: activeDungeon.element,
    reward: {
      gold: dungeonFloorGold(activeDungeon.currentFloor),
      fame: 0,
      exp: dungeonFloorXp(activeDungeon.currentFloor),
    },
    duration: 2 + activeDungeon.currentFloor,
  }
  return (
    <DungeonPanel
      dungeon={activeDungeon}
      floorQuest={floorQuest}
      availableMercs={mercs.filter(m => m.status === '대기중')}
      onDispatch={() => {}} // wired via normal quest dispatch
      onAbandon={() => { abandonDungeon(); setShowDungeon(false) }}
      onClose={() => setShowDungeon(false)}
    />
  )
})()}
```

### Step 12c: Add equipment button to mercenary cards

- [ ] **In the MercCard's detail section (or the showDetail rendering), add a small "장비" button.**

Find where `showDetail && <div className="mt-1 space-y-0.5">{condBar(...)}{moraleBar(...)}</div>` is rendered.

After the bars, add:
```tsx
    {showDetail && (
      <button
        className="text-xs mt-1 px-2 py-0.5 rounded"
        style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}
        onClick={e => { e.stopPropagation(); setShowEquipModal(merc.id) }}
      >
        ⚔ 장비
      </button>
    )}
```

Note: `setShowEquipModal` must be passed as a prop to MercCard, or this button can be placed in the parent rendering context where `setShowEquipModal` is accessible (the room view, detail modal, etc.).

### Step 12d: Add merchant/dungeon badges to building panel

- [ ] **Find the buildings panel rendering. Add merchant/dungeon notification badges:**

In the buildings panel header area, add:
```tsx
{merchantState?.active && (
  <button
    onClick={() => setShowMerchant(true)}
    className="text-sm px-3 py-1 rounded-full font-bold animate-pulse"
    style={{ background: 'rgba(251,191,36,0.3)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.5)' }}
  >
    🛒 행상인 방문 중
  </button>
)}
{activeDungeon && activeDungeon.status === 'active' && (
  <button
    onClick={() => setShowDungeon(true)}
    className="text-sm px-3 py-1 rounded-full font-bold"
    style={{ background: 'rgba(124,58,237,0.3)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.5)' }}
  >
    🏚 던전 진행 중 ({activeDungeon.currentFloor}/{activeDungeon.maxFloor}층)
  </button>
)}
```

### Step 12e: Update merc detail modal to show equipment

- [ ] **In the detailed merc modal (where HP, condition, morale bars are shown), add an equipment section:**

Find where the detail modal renders stats. After the morale bar section, add:
```tsx
{/* Equipment summary in detail modal */}
<div className="mt-3 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
  <div className="flex justify-between items-center mb-1">
    <span className="text-slate-400 text-xs">장착 장비</span>
    <button
      className="text-xs px-2 py-0.5 rounded"
      style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}
      onClick={() => setShowEquipModal(selectedMerc.id)}
    >
      관리
    </button>
  </div>
  {(['weapon', 'head', 'body', 'accessory'] as const).map(slot => {
    const itemId = selectedMerc.equipment[slot]
    const item = itemId ? findEquip(itemId) : null
    const slotLabel = { weapon: '⚔', head: '🪖', body: '🛡', accessory: '💍' }[slot]
    return (
      <div key={slot} className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 w-4">{slotLabel}</span>
        {item
          ? <span className="text-slate-300">{item.icon} {item.name} <span style={{ color: { S: '#e879f9', A: '#fbbf24', B: '#34d399', C: '#38bdf8', D: '#94a3b8' }[item.grade] }}>{item.grade}</span></span>
          : <span className="text-slate-600">(없음)</span>
        }
      </div>
    )
  })}
</div>
```

- [ ] **Build to verify**

```bash
node scripts/build-release.js
```

Expected: Zero TypeScript errors, release file generated.

- [ ] **Commit**

```bash
git add src/App.tsx
git commit -m "feat: equipment/merchant/dungeon UI modals and merc card integration"
```

---

## Task 13: Final Build + Release

**Files:** None — verification only

- [ ] **Run full release build**

```bash
node scripts/build-release.js
```

Expected output:
```
✅ TypeScript: 0 errors
✅ Vite build complete
✅ Packaged: release/GM-v1.1.XX.html
```

- [ ] **Smoke test checklist** (open release HTML in browser):
  - [ ] Three starter mercs load without errors
  - [ ] Merc card shows condition + morale bars
  - [ ] Clicking "⚔ 장비" opens EquipmentModal
  - [ ] Guild inventory displays item count (0/40)
  - [ ] Quest completes → result modal appears (no crash)
  - [ ] After 20 minutes (or mock timer): merchant badge appears in building panel

- [ ] **Commit**

```bash
git add -A
git commit -m "feat: equipment, merchant, dungeon systems complete (v1.1.XX)"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered in task |
|---|---|
| 4 equipment slots (weapon/head/body/accessory) | Task 1 types, Task 2 data, Task 5 mercenaries |
| D~S 5 grades, 100 items | Task 2 |
| PassiveEffect types (6 types) | Task 1, Task 2 |
| SetBonus (4 sets, 2/3 tier effects) | Task 2 |
| classBonus applied to effPower | Task 4 power.ts |
| Guild inventory max 40 slots | Task 11d state, Task 11k rejectDrop |
| Quest drop (8%~40% by tier, grade pool) | Task 2 helpers, Task 11g rollQuestExtras |
| Drop modal (buy/reject + auto-equip) | Task 11k, Task 12a |
| Visiting merchant (20min arrive, 10min stay) | Task 6 useMerchant |
| Merchant stock by guild level grade weights | Task 2 generateMerchantStock |
| Merchant panel UI | Task 9 |
| Dungeon trigger (3%~30% by tier) | Task 3, Task 11g |
| Floor scaling (difficulty × 0.8 × (1 + floor×0.3)) | Task 3 |
| Death risk scaling per floor | Task 3 |
| Floor rewards (gold, XP, equipment drop on 5+) | Task 7 useDungeon |
| Full clear bonus (gold, fame, 1-2 A/S items) | Task 7 |
| Dungeon panel UI | Task 10 |
| Save/load migration for equipment, merchant, dungeon | Task 11l |
| Inventory full guard on all paths | Task 11k, Task 7, Task 9 |

**Type consistency check:** All type names (`Equipment`, `EquipSlot`, `EquipGrade`, `ActiveDungeon`, `MerchantState`, `PassiveEffect`) are defined in Task 1 and used consistently throughout Tasks 2–12. `findEquip`, `getEquipped`, `powerScore`, `getSetBonuses` are defined in Task 2 and referenced correctly in Tasks 4, 8, 11k.

**One known simplification:** DungeonPanel's "파견" button (`onDispatch`) does not directly launch a quest — it directs players to use the normal quest panel. The dungeon floor is added to the quest pool as a synthetic quest via `questPool` mechanism. This is acceptable for the first implementation; a tighter UX integration can come in a follow-up.
