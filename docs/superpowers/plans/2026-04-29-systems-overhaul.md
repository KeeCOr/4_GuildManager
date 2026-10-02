# Systems Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 15개 시스템 추가/개편 — 명성 개편, 훈련소 세분화, 잠재력, 성격, 전문성, 의뢰인 NPC, 퀘스트 보고서, 피로 시스템, 마석 자원.

**Architecture:** `types.ts` 확장 → 데이터 레이어(quests/buildings/clients) → 유틸(quest/power/fame/specialty/retirement) → `useGameLoop` 통합 순서로 진행. 각 태스크는 독립적으로 빌드·검증 가능하도록 설계. UI 연결은 각 태스크 마지막 단계에서 기존 패널에 wire.

**Tech Stack:** React 18, TypeScript, Vite, localStorage, 빌드: `node scripts/build-release.js`

---

## 구현 범위 요약 (features → tasks 매핑)

| # | 기능 | Task |
|---|------|------|
| 1 | 퀘스트 실패 시 명성 감소 | Task 2 |
| 2 | 명성 낮으면 나쁜 용병 도착 확률 높음 | Task 2 |
| 3 | 훈련소 세분화 (마법/레인저/전사) | Task 3 |
| 4 | 직업·종족 개선 | Task 3 |
| 5 | 명성 높으면 고난도 의뢰 + 미수주 명성 감소 | Task 2 |
| 6 | 잠재력 시스템 | Task 4 |
| 7 | 나이 시스템 개선 (은퇴 확률, 성장률) | Task 5 |
| 8 | FM식 성격 시스템 | Task 5 |
| 9 | 전문성 태그 시스템 | Task 6 |
| 10 | 의뢰인 NPC 시스템 | Task 7 |
| 11 | 마석 자원 (드랍, 각성, 리롤) | Task 4 |
| 12 | 퀘스트 보고서 | Task 8 |
| 13 | 연속 파견 피로 | Task 8 |
| 14 | 퀘스트 특징 강화 | Task 8 |
| 15 | 파견 시간별 피로 증가 | Task 8 |

---

## Task 1: Types & Constants 확장

**Files:**
- Modify: `src/types.ts`
- Modify: `src/constants.ts`

- [ ] **Step 1: types.ts 전체 재작성**

```typescript
// src/types.ts

export type Race = '엘프' | '인간' | '드워프' | '수인'
export type Gender = '남' | '여'
export type MercenaryClass = '궁수' | '성직자' | '도적' | '마법사' | '전사'
export type MercenaryGrade = 'D' | 'C' | 'B' | 'A' | 'S'
export type MercenaryStatus = '대기중' | '파견중' | '부상' | '영혼'
export type BuildingId = 'hall' | 'barracks' | 'training' | 'tavern' | 'infirmary'
export type RoomId = '훈련소' | '길드마스터룸' | '식당' | '마법훈련소' | '레인저훈련소' | '전사훈련소'
export type QuestType = 'combat' | 'escort' | 'dungeon' | 'trap' | 'hunt' | 'monster' | 'support' | 'patrol'
export type SpecialtyTag =
  | 'dungeon_veteran'   // 던전 3회 완료 → 던전 성공률 +12%, 사망 ×0.85
  | 'escort_expert'     // 호위 3회 완료 → 호위 성공률 +10%, 금화 +10%
  | 'trap_specialist'   // 함정 5회 완료 → trapDisarm ×1.3
  | 'survivor'          // 사망위험 30%+ 퀘스트 5회 생존 → 사망위험 ×0.80
  | 'lone_wolf'         // 1인 파티 성공 3회 → 단독 파견 시 효율 ×1.15
  | 'iron_will'         // 컨디션 30 이하 성공 3회 → 컨디션 최소치 10 대신 5
  | 'beast_slayer'      // 몬스터/사냥 5회 완료 → 해당 퀘스트 success +10%
  | 'shadow_walker'     // 암흑 속성 퀘스트 5회 완료 → 암흑 속성 일치 보너스 +5%

export interface Potential {
  maxGrade: MercenaryGrade  // 달성 가능 최대 등급 (생성 시 결정, 숨겨짐)
  revealed: boolean          // 플레이어가 알고 있는가
  awakened: boolean          // 강제 각성 완료 (마석 5개 사용)
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
  // FM 성격 (v2 추가)
  ambition: number        // 0-100: 높으면 비활약 시 불만 (호감도 -3/day after 3 idle days)
  loyalty: number         // 0-100: 높으면 이탈 기준 완화 (70이상→호감도 15까지 버팀)
  professionalism: number // 0-100: 높으면 컨디션 자가회복 (+2/day when 80+)
  mentality: number       // 0-100: 높으면 실패 페널티 감소 (80이상→페널티 ×0.7)
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
  questHistory: Partial<Record<QuestType, number>>  // type별 완료 횟수
  consecutiveDispatches: number   // 연속 파견 횟수
  lastDispatchEndDay: number      // 마지막 파견 종료 게임일 (0=없음)
  idleDays: number                // 비파견 연속일 (야망 시스템용)
  specialtyBonuses: {             // 훈련소 임시 버프 (다음 퀘스트에 적용, 완료 후 초기화)
    elementBonus: number          // 마법훈련소: 속성 일치 보너스 +N%
    survBonus: number             // 레인저훈련소: 생존율 임시 +N
    atkBonus: number              // 전사훈련소: 공격력 임시 +N
  }
}

export interface Quest {
  id: string
  name: string
  questType: QuestType
  clientId: string                // 의뢰인 NPC ID
  difficulty: number
  reward: {
    gold: number
    fame: number
    exp: number
  }
  famePenalty: number             // 실패 시 명성 감소량
  description: string
  slots: number
  minSlots: number
  duration: number
  deathRisk: number
  conditionDrain: number
  dailyGoldCost: number
  element: '불' | '얼음' | '번개' | '자연' | '암흑' | '빛'
  trapFocus: boolean
  isUrgentEligible: boolean       // 명성 높으면 긴급 의뢰로 전환 가능
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
  questBonus: number              // 관계 80+ 시 금화 보너스 (%)
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
  magicStones: number             // 마석 (몬스터/던전 드랍)
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
  clientRelations: Record<string, number>    // clientId → 0-100
  urgentQuestIds: string[]                   // 현재 긴급 의뢰 ID 목록
  urgentQuestExpiries: Record<string, number> // questId → expiry timestamp
  pendingReports: QuestReport[]              // 플레이어 확인 대기 보고서
}
```

- [ ] **Step 2: constants.ts에 새 상수 추가** (`src/constants.ts` 파일 끝에 append)

```typescript
export const QUEST_TYPE_LABEL: Record<QuestType, string> = {
  combat:  '전투', escort: '호위', dungeon: '던전', trap: '함정',
  hunt:    '사냥', monster: '몬스터', support: '지원', patrol: '순찰',
}

export const QUEST_TYPE_ICON: Record<QuestType, string> = {
  combat: '⚔️', escort: '🛡', dungeon: '🏚', trap: '🔧',
  hunt: '🏹', monster: '🐉', support: '🕊️', patrol: '👁',
}

export const SPECIALTY_TAG_DESC: Record<SpecialtyTag, { label: string; effect: string }> = {
  dungeon_veteran:  { label: '던전 베테랑', effect: '던전 성공률 +12%, 사망위험 ×0.85' },
  escort_expert:    { label: '호위 전문가', effect: '호위 성공률 +10%, 금화 +10%' },
  trap_specialist:  { label: '함정 전문가', effect: '함정해제 ×1.3' },
  survivor:         { label: '생존의 귀재', effect: '사망위험 ×0.80' },
  lone_wolf:        { label: '고독한 전사', effect: '단독 파견 효율 ×1.15' },
  iron_will:        { label: '강철 의지', effect: '컨디션 최소치 5까지 파견 가능' },
  beast_slayer:     { label: '야수 사냥꾼', effect: '몬스터/사냥 성공률 +10%' },
  shadow_walker:    { label: '그림자 보행자', effect: '암흑 속성 일치 보너스 +5%' },
}

export const MAGIC_STONE_COSTS = {
  revealPotential: 1,   // 잠재력 공개
  rerollPotential: 3,   // 잠재력 리롤
  forceAwaken: 5,       // 강제 각성 (등급 +1, 1회)
} as const

export const URGENT_QUEST_FAME_THRESHOLD = 180  // Lv4 명성부터 긴급 의뢰 활성화
export const URGENT_QUEST_EXPIRY_DAYS = 3        // 3 게임일 내 수주 안 하면 명성 -5
export const URGENT_QUEST_MISS_FAME_PENALTY = 5

export const CONSECUTIVE_DISPATCH_BURNOUT = 3   // 3회 연속 파견 → 번아웃
export const IDLE_AMBITION_THRESHOLD = 3         // 3일 비파견 → 야망 불만 시작
```

- [ ] **Step 3: constants.ts에서 QuestType, SpecialtyTag import 추가**

`src/constants.ts` 첫 줄에 추가:
```typescript
import type { QuestType, SpecialtyTag } from './types'
```

- [ ] **Step 4: 빌드 확인**

```bash
cd C:/Development/4_GM && npx tsc --noEmit 2>&1 | head -30
```

타입 오류 없으면 진행. 오류 있으면 수정 후 재확인.

- [ ] **Step 5: 커밋**

```bash
git add src/types.ts src/constants.ts
git commit -m "feat: types & constants - add potential/personality/specialty/client/QuestType"
```

---

## Task 2: 명성 시스템 개편 (features 1, 2, 5)

**Files:**
- Modify: `src/utils/fame.ts` (NEW)
- Modify: `src/data/quests.ts` (famePenalty, questType 추가)
- Modify: `src/data/mercenaries.ts` (fame 기반 등급 가중치)
- Modify: `src/hooks/useGameLoop.ts` (실패 시 fame 차감, 긴급 의뢰 만료)

- [ ] **Step 1: src/utils/fame.ts 생성**

```typescript
// src/utils/fame.ts
import { URGENT_QUEST_FAME_THRESHOLD, URGENT_QUEST_MISS_FAME_PENALTY, URGENT_QUEST_EXPIRY_DAYS } from '../constants'
import { ALL_QUESTS } from '../data/quests'
import type { Quest } from '../types'

/** 명성에 따른 용병 도착 등급 가중치 보정 */
export function gradeWeightsByFame(fame: number): Record<string, number> {
  // 명성 0~29: D급 증가
  // 명성 30~79: 기본
  // 명성 80+: B급 이상 증가
  if (fame < 30) {
    return { D: 1.5, C: 1.0, B: 0.5, A: 0.2, S: 0.1 }
  } else if (fame < 80) {
    return { D: 1.0, C: 1.0, B: 1.0, A: 1.0, S: 1.0 }
  } else if (fame < 180) {
    return { D: 0.7, C: 1.0, B: 1.2, A: 1.3, S: 0.8 }
  } else {
    return { D: 0.4, C: 0.8, B: 1.2, A: 1.5, S: 1.2 }
  }
}

/** 긴급 의뢰 발생 여부 및 후보 퀘스트 ID 목록 */
export function pickUrgentQuestCandidates(
  fame: number,
  completedQuestIds: string[],
  currentUrgentIds: string[]
): string[] {
  if (fame < URGENT_QUEST_FAME_THRESHOLD) return []
  return ALL_QUESTS
    .filter(q => q.isUrgentEligible)
    .filter(q => !completedQuestIds.includes(q.id))
    .filter(q => !currentUrgentIds.includes(q.id))
    .map(q => q.id)
}

/** 긴급 의뢰 만료 시 명성 패널티 */
export const URGENT_MISS_PENALTY = URGENT_QUEST_MISS_FAME_PENALTY

/** 게임일 기준 긴급 의뢰 만료 시각 (ms) 계산
 *  1 게임일 = 5분 실시간 */
export const GAME_DAY_MS = 5 * 60 * 1000
export function urgentExpiryMs(currentMs: number): number {
  return currentMs + URGENT_QUEST_EXPIRY_DAYS * GAME_DAY_MS
}
```

- [ ] **Step 2: quests.ts 의 ALL_QUESTS 각 항목에 questType, famePenalty, clientId, isUrgentEligible 추가**

각 퀘스트에 아래 필드를 추가한다. 전체 목록 기준:

```
q20 길드 심부름       questType: 'support',  famePenalty: 0,  clientId: 'guild',    isUrgentEligible: false
q21 약초 수집         questType: 'support',  famePenalty: 1,  clientId: 'church',   isUrgentEligible: false
q1  쥐 사냥           questType: 'combat',   famePenalty: 1,  clientId: 'merchant', isUrgentEligible: false
q11 마을 치유 봉사    questType: 'support',  famePenalty: 1,  clientId: 'church',   isUrgentEligible: false
q22 불량배 제압       questType: 'combat',   famePenalty: 2,  clientId: 'merchant', isUrgentEligible: false
q23 유령 퇴치         questType: 'combat',   famePenalty: 2,  clientId: 'church',   isUrgentEligible: false
q24 광부 구조         questType: 'trap',     famePenalty: 2,  clientId: 'guild',    isUrgentEligible: false
q2  야간 경비         questType: 'patrol',   famePenalty: 2,  clientId: 'noble',    isUrgentEligible: false
q3  상인 호위         questType: 'escort',   famePenalty: 3,  clientId: 'merchant', isUrgentEligible: false
q12 얼음 동굴 수색    questType: 'dungeon',  famePenalty: 3,  clientId: 'mage',     isUrgentEligible: false
q4  도둑단 소탕       questType: 'hunt',     famePenalty: 5,  clientId: 'noble',    isUrgentEligible: false
q5  광산 함정 해제    questType: 'trap',     famePenalty: 5,  clientId: 'merchant', isUrgentEligible: true
q13 독숲 정찰         questType: 'patrol',   famePenalty: 4,  clientId: 'guild',    isUrgentEligible: false
q14 번개 정령 포획    questType: 'monster',  famePenalty: 5,  clientId: 'mage',     isUrgentEligible: true
q6  밀수단 추적       questType: 'hunt',     famePenalty: 6,  clientId: 'noble',    isUrgentEligible: true
q7  귀족 저택 장기 경비 questType:'patrol',  famePenalty: 5,  clientId: 'noble',    isUrgentEligible: true
q15 설원 요새 탈환    questType: 'combat',   famePenalty: 6,  clientId: 'military', isUrgentEligible: true
q16 성소 수호 임무    questType: 'patrol',   famePenalty: 5,  clientId: 'church',   isUrgentEligible: true
q8  던전 탐사         questType: 'dungeon',  famePenalty: 8,  clientId: 'mage',     isUrgentEligible: true
q9  북방 약탈자 토벌  questType: 'combat',   famePenalty: 10, clientId: 'military', isUrgentEligible: true
q17 마법사 탑 잠입    questType: 'dungeon',  famePenalty: 8,  clientId: 'rogue',    isUrgentEligible: true
q18 빙원 극지 원정    questType: 'monster',  famePenalty: 10, clientId: 'military', isUrgentEligible: true
q10 드래곤 토벌       questType: 'monster',  famePenalty: 20, clientId: 'military', isUrgentEligible: false
```

`quests.ts` 파일의 각 퀘스트 객체에 해당 필드를 삽입한다.

- [ ] **Step 3: mercenaries.ts 의 generateArrival 함수에 fame 파라미터 추가**

`src/data/mercenaries.ts`에서 `generateMercenary` 또는 도착 용병 생성 함수를 찾아 아래와 같이 수정:

```typescript
import { gradeWeightsByFame } from '../utils/fame'

// 기존 등급 결정 로직 (tavern 레벨 기반) 위에 fame 가중치 곱산
export function weightedGradeByFame(
  tavernLevel: number,
  fame: number
): MercenaryGrade {
  const BASE_WEIGHTS: Record<string, number[]> = {
    // [D, C, B, A, S] 인덱스 = tavernLevel 0~4
    D: [65, 60, 40, 25, 15],
    C: [30, 35, 40, 35, 25],
    B: [5,   5, 18, 28, 30],
    A: [0,   0,  2, 11, 25],
    S: [0,   0,  0,  1,  5],
  }
  const fameWeights = gradeWeightsByFame(fame)
  const grades: MercenaryGrade[] = ['D', 'C', 'B', 'A', 'S']
  const lv = Math.min(tavernLevel, 4)
  const weights = grades.map(g =>
    (BASE_WEIGHTS[g]?.[lv] ?? 0) * (fameWeights[g] ?? 1)
  )
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < grades.length; i++) {
    r -= weights[i]
    if (r <= 0) return grades[i]
  }
  return 'D'
}
```

- [ ] **Step 4: useGameLoop.ts 에서 퀘스트 실패 시 fame 차감 적용**

`useGameLoop.ts`의 실패 블록을 찾아:
```typescript
// 기존
morale = Math.max(0, morale - 8)
logs.push(`❌ [${quest.name}] 실패!...`)

// 변경 후 (famePenalty 차감 추가)
morale = Math.max(0, morale - 8)
const fameLoss = quest.famePenalty ?? 0
if (fameLoss > 0) {
  fame = Math.max(0, fame - fameLoss)
  logs.push(`⭐ 명성 -${fameLoss} (${quest.name} 실패)`)
}
logs.push(`❌ [${quest.name}] 실패!...`)
```

- [ ] **Step 5: 긴급 의뢰 만료 체크를 useGameLoop 데일리 틱에 추가**

`useGameLoop.ts`의 일 경과 처리 부분(day tick)에:
```typescript
// urgentQuestExpiries 체크
const nowMs = Date.now()
const expired = Object.entries(urgentQuestExpiries)
  .filter(([, expiry]) => expiry <= nowMs)
  .map(([qid]) => qid)
if (expired.length > 0) {
  fame = Math.max(0, fame - expired.length * URGENT_QUEST_MISS_FAME_PENALTY)
  logs.push(`⚠ 긴급 의뢰 ${expired.length}건 미수주 — 명성 -${expired.length * URGENT_QUEST_MISS_FAME_PENALTY}`)
  // expired IDs를 urgentQuestIds/Expiries에서 제거
}
```

- [ ] **Step 6: 빌드 확인 후 커밋**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/utils/fame.ts src/data/quests.ts src/data/mercenaries.ts src/hooks/useGameLoop.ts
git commit -m "feat: fame system - failure penalty, grade weights by fame, urgent quests"
```

---

## Task 3: 훈련소 세분화 + 직업/종족 개선 (features 3, 4)

**Files:**
- Modify: `src/data/buildings.ts` (새 룸 3종 추가)
- Modify: `src/utils/power.ts` (직업/종족 개선 반영)
- Modify: `src/utils/quest.ts` (직업/종족 보너스 수정)
- Modify: `src/hooks/useGameLoop.ts` (훈련소 데일리 버프)

- [ ] **Step 1: buildings.ts 에 새 룸 3종 추가**

```typescript
// src/data/buildings.ts - ROOM_UPGRADE_COSTS 에 추가
export const ROOM_UPGRADE_COSTS: Record<string, readonly [number, number]> = {
  '길드마스터룸': [500, 1200],
  '훈련소':       [150, 350],
  '식당':         [200, 500],
  '마법훈련소':   [300, 700],   // 마법사 전용 속성 훈련
  '레인저훈련소': [250, 600],   // 궁수/도적 생존 훈련
  '전사훈련소':   [280, 650],   // 전사 전투력 훈련
}

// ROOM_EFFECTS 에 추가
export const ROOM_EFFECTS: Record<string, { desc: string[]; icon: string }> = {
  '길드마스터룸': { icon: '👑', desc: ['호감도+1/일', '호감도+2/일', '호감도+3/일'] },
  '훈련소':       { icon: '⚔️', desc: ['XP+1/일', 'XP+3/일', 'XP+6/일'] },
  '식당':         { icon: '🍖', desc: ['최대 6명 고용', '최대 9명, 도착+1명', '최대 12명, 도착+2명'] },
  '마법훈련소':   { icon: '🔮', desc: ['속성 일치 +4% (마법사)', '속성 일치 +7%', '속성 일치 +10%'] },
  '레인저훈련소': { icon: '🏹', desc: ['생존율 임시 +5 (궁수/도적)', '생존율 +10', '생존율 +15'] },
  '전사훈련소':   { icon: '🛡', desc: ['공격력 임시 +5 (전사)', '공격력 +10', '공격력 +15'] },
}

// 용량 헬퍼
export const specialTrainCapacity = (lv: number) => [2, 3, 4][Math.min(lv - 1, 2)]

// 마법훈련소 버프값 (다음 퀘스트 속성 일치 추가 %)
export const mageTrainBonus = (lv: number) => [4, 7, 10][Math.min(lv - 1, 2)]
// 레인저훈련소 생존율 임시 보너스
export const rangerTrainBonus = (lv: number) => [5, 10, 15][Math.min(lv - 1, 2)]
// 전사훈련소 공격력 임시 보너스
export const warriorTrainBonus = (lv: number) => [5, 10, 15][Math.min(lv - 1, 2)]
```

- [ ] **Step 2: power.ts effPower 함수에 specialtyBonuses 반영**

```typescript
// src/utils/power.ts
export const effPower = (m: Mercenary): number => {
  const favMod = 1 + (m.favorability - 50) / 500
  // 나이 페널티 (Task 5에서 확장, 여기서는 기존 로직 유지)
  const ageMult = m.age >= 55 ? 0 :
    m.age >= 38 ? 1 - (m.age - 38) / 34 * 0.5 : 1
  // 연속 파견 번아웃 (Task 8에서 확장)
  const burnoutMult = m.consecutiveDispatches >= 3 ? 0.85 : 1
  // 전사훈련소 임시 공격력 보너스
  const atkBuff = m.specialtyBonuses?.atkBonus ?? 0
  return Math.round(
    (m.power + wPow(m) + atkBuff)
    * (0.4 + 0.6 * m.condition / 100)
    * favMod * ageMult * burnoutMult
  )
}
```

- [ ] **Step 3: quest.ts calcSuccessRate에 직업/종족 개선 및 훈련소 버프 반영**

`calcSuccessRate` 함수 내 속성 일치 보너스 계산 부분에 추가:
```typescript
// 마법훈련소 버프 반영 (속성 일치 시 추가)
for (const m of assigned.filter(m => m.element === quest.element)) {
  const elementBuff = m.specialtyBonuses?.elementBonus ?? 0
  switch (m.element) {
    case '불':   rate = Math.min(95, rate + 13 + elementBuff); break
    case '얼음': rate = Math.min(95, rate + 8  + elementBuff); break
    case '번개': rate = Math.min(95, rate + 9  + elementBuff); break
    case '자연': rate = Math.min(95, rate + 10 + elementBuff); break
    case '암흑': rate = Math.min(95, rate + 11 + elementBuff); break
    case '빛':   rate = Math.min(95, rate + 14 + elementBuff); break
  }
}

// 레인저훈련소 생존 버프 (서바이벌 상승으로 간접 반영 — 직접 success 보너스)
const rangerBuff = assigned
  .filter(m => (m.class === '궁수' || m.class === '도적') && (m.specialtyBonuses?.survBonus ?? 0) > 0)
  .length
if (rangerBuff > 0) rate = Math.min(95, rate + rangerBuff * 3)
```

직업 개선 추가 (기존 직업 보너스 블록 후):
```typescript
// 직업 개선 v2
// 도적: 실패 시에도 생존 특화 (여기서는 success rate에 반영 안 함 — death risk에서 처리)
// 궁수: 번개 속성 시간 단축 효과는 quest.ts calcQuestDurationMs에서 처리
// 마법사 고레벨(5+) 속성 보너스
for (const m of assigned.filter(m => m.class === '마법사' && m.level >= 5 && m.element === quest.element)) {
  rate = Math.min(95, rate + 5)
}
// 인간 종족 케미 보너스
const humanCount = assigned.filter(m => m.race === '인간').length
if (humanCount > 0) rate = Math.min(95, rate + humanCount * 2)
```

- [ ] **Step 4: quest.ts calcMercDeathRisk에 직업/종족 개선 반영**

```typescript
// 도적: 실패 시 생존 (탈출 능력)
if (merc.class === '도적') risk *= 0.75  // 기존 0.78에서 추가 감소

// 레인저훈련소 생존 버프 직접 반영
const survBuff = merc.specialtyBonuses?.survBonus ?? 0
if (survBuff > 0) risk *= Math.max(0.5, 1 - survBuff / 100)

// 드워프: 연속 파견 피로 임계치 +1 → 번아웃 기준 4회 (burnout 체크는 useGameLoop에서)
// 엘프 + 마법사 조합: 속성 일치 시 사망위험 추가 감소
if (merc.race === '엘프' && merc.class === '마법사' && merc.element === quest.element) {
  risk *= 0.88
}
```

- [ ] **Step 5: useGameLoop 데일리 틱에 훈련소 버프 적용 로직 추가**

일 경과(day advance) 처리 부분에서:
```typescript
// 마법훈련소에 배치된 용병: elementBonus 갱신
const mageLv = roomLevels['마법훈련소'] ?? 0
const rangerLv = roomLevels['레인저훈련소'] ?? 0
const warriorLv = roomLevels['전사훈련소'] ?? 0
nextMercs = nextMercs.map(m => {
  if (m.status === '파견중') return m
  const isMageRoom = m.room === '마법훈련소' && mageLv > 0
  const isRangerRoom = m.room === '레인저훈련소' && rangerLv > 0
  const isWarriorRoom = m.room === '전사훈련소' && warriorLv > 0
  return {
    ...m,
    specialtyBonuses: {
      elementBonus: isMageRoom ? mageTrainBonus(mageLv) : 0,
      survBonus:    isRangerRoom ? rangerTrainBonus(rangerLv) : 0,
      atkBonus:     isWarriorRoom ? warriorTrainBonus(warriorLv) : 0,
    }
  }
})
```

퀘스트 완료 후 버프 초기화:
```typescript
// 퀘스트 완료된 용병의 specialtyBonuses 초기화
nextMercs = nextMercs.map(m => {
  if (!aq.assignedMercIds.includes(m.id)) return m
  return { ...m, specialtyBonuses: { elementBonus: 0, survBonus: 0, atkBonus: 0 } }
})
```

- [ ] **Step 6: 빌드 확인 후 커밋**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/data/buildings.ts src/utils/power.ts src/utils/quest.ts src/hooks/useGameLoop.ts
git commit -m "feat: specialized training rooms + class/race improvements"
```

---

## Task 4: 잠재력 + 마석 시스템 (features 6, 11)

**Files:**
- Modify: `src/data/mercenaries.ts` (잠재력 생성 로직)
- Create: `src/utils/potential.ts`
- Modify: `src/hooks/useGameLoop.ts` (마석 드랍)

- [ ] **Step 1: src/utils/potential.ts 생성**

```typescript
// src/utils/potential.ts
import type { Mercenary, MercenaryGrade, Potential } from '../types'
import { MAGIC_STONE_COSTS } from '../constants'

const GRADE_ORDER: MercenaryGrade[] = ['D', 'C', 'B', 'A', 'S']
const gradeIndex = (g: MercenaryGrade) => GRADE_ORDER.indexOf(g)

/** 생성 시 잠재력 결정 — 현재 등급에서 0~2단계 위 */
export function rollPotential(currentGrade: MercenaryGrade): Potential {
  const idx = gradeIndex(currentGrade)
  const maxIdx = Math.min(4, idx + Math.floor(Math.random() * 3))  // 0~2 위
  return {
    maxGrade: GRADE_ORDER[maxIdx],
    revealed: false,
    awakened: false,
  }
}

/** 잠재력이 개방되는 조건 */
export function shouldRevealPotential(m: Mercenary): boolean {
  return !m.potential.revealed && m.level >= 5
}

/** 마석 1개로 잠재력 강제 공개 */
export function revealPotential(m: Mercenary): Mercenary {
  return { ...m, potential: { ...m.potential, revealed: true } }
}

/** 마석 3개로 잠재력 리롤 */
export function rerollPotential(m: Mercenary): Mercenary {
  return { ...m, potential: rollPotential(m.grade) }
}

/** 마석 5개로 강제 각성: 현재 등급을 잠재력 maxGrade로 즉시 승급 */
export function forceAwaken(m: Mercenary): Mercenary {
  if (m.potential.awakened) return m
  if (gradeIndex(m.grade) >= gradeIndex(m.potential.maxGrade)) return m
  const newGrade = m.potential.maxGrade
  // 등급 승급 시 스탯도 상승
  const statBoost = (gradeIndex(newGrade) - gradeIndex(m.grade)) * 8
  return {
    ...m,
    grade: newGrade,
    power: m.power + statBoost,
    stats: {
      공격력: m.stats.공격력 + statBoost,
      함정해제: m.stats.함정해제 + Math.floor(statBoost * 0.7),
      생존율: m.stats.생존율 + Math.floor(statBoost * 0.7),
      협조성: m.stats.협조성 + Math.floor(statBoost * 0.3),
    },
    deathCost: { D: 80, C: 150, B: 280, A: 500, S: 1000 }[newGrade],
    potential: { ...m.potential, awakened: true, revealed: true },
  }
}

/** 레벨업 시 잠재력 자동 공개 체크 */
export function checkPotentialReveal(m: Mercenary): Mercenary {
  if (shouldRevealPotential(m)) {
    return { ...m, potential: { ...m.potential, revealed: true } }
  }
  return m
}
```

- [ ] **Step 2: mercenaries.ts 의 generateMercenary 함수에 potential 필드 추가**

`generateMercenary` 함수 내 return 객체에:
```typescript
import { rollPotential } from '../utils/potential'

// 용병 생성 시 추가
potential: rollPotential(grade),
specialtyTags: [],
questHistory: {},
consecutiveDispatches: 0,
lastDispatchEndDay: 0,
idleDays: 0,
specialtyBonuses: { elementBonus: 0, survBonus: 0, atkBonus: 0 },
```

`initialMercenaries` 배열의 기존 3명에도 동일 필드 추가:
```typescript
// m1, m2, m3 각각
potential: { maxGrade: 'B', revealed: false, awakened: false },  // m1: D급, 잠재력 B
potential: { maxGrade: 'B', revealed: false, awakened: false },  // m2: D급, 잠재력 B
potential: { maxGrade: 'A', revealed: true,  awakened: false },  // m3: C급, 잠재력 A (이미 알고 있음)
specialtyTags: [],
questHistory: {},
consecutiveDispatches: 0,
lastDispatchEndDay: 0,
idleDays: 0,
specialtyBonuses: { elementBonus: 0, survBonus: 0, atkBonus: 0 },
```

- [ ] **Step 3: useGameLoop.ts 퀘스트 성공 시 마석 드랍 추가**

성공 블록 내:
```typescript
// 마석 드랍 (던전/몬스터/사냥 타입만)
const MAGIC_STONE_DROP_TYPES: QuestType[] = ['dungeon', 'monster', 'hunt']
const questData = ALL_QUESTS.find(q => q.id === aq.questId)
let magicStonesDrop = 0
if (questData && MAGIC_STONE_DROP_TYPES.includes(questData.questType)) {
  if (Math.random() < 0.15) {
    magicStonesDrop = 1
    logs.push(`💎 마석 1개 획득! (${questData.name})`)
  }
}
// state 업데이트 시 magicStones 반영
// setState 호출 부분에서: magicStones: Math.min(99, state.magicStones + magicStonesDrop)
```

- [ ] **Step 4: useGameLoop.ts 레벨업 시 potential 자동 공개**

레벨업 블록 내:
```typescript
import { checkPotentialReveal } from '../utils/potential'

// 레벨업 후
const updatedMerc = { ...m, level, experience: exp, expToNext, ... }
const potentialChecked = checkPotentialReveal(updatedMerc)
if (potentialChecked.potential.revealed && !m.potential.revealed) {
  logs.push(`✨ ${m.name}의 잠재력이 개방됨! — 최대 ${potentialChecked.potential.maxGrade}급`)
}
return potentialChecked
```

- [ ] **Step 5: SaveSlotData 마이그레이션 - useSaveLoad.ts 업데이트**

`src/hooks/useSaveLoad.ts`를 열고 불러오기 시 기본값 fallback 추가:
```typescript
// 저장 데이터 로드 시 신규 필드 fallback
const migrateSave = (data: any): SaveSlotData => ({
  ...data,
  campaignState: {
    ...data.campaignState,
    magicStones: data.campaignState?.magicStones ?? 0,
  },
  clientRelations: data.clientRelations ?? {},
  urgentQuestIds: data.urgentQuestIds ?? [],
  urgentQuestExpiries: data.urgentQuestExpiries ?? {},
  pendingReports: data.pendingReports ?? [],
  mercs: (data.mercs ?? []).map((m: any) => ({
    ...m,
    potential: m.potential ?? { maxGrade: m.grade, revealed: false, awakened: false },
    specialtyTags: m.specialtyTags ?? [],
    questHistory: m.questHistory ?? {},
    consecutiveDispatches: m.consecutiveDispatches ?? 0,
    lastDispatchEndDay: m.lastDispatchEndDay ?? 0,
    idleDays: m.idleDays ?? 0,
    specialtyBonuses: m.specialtyBonuses ?? { elementBonus: 0, survBonus: 0, atkBonus: 0 },
    traits: {
      ...m.traits,
      ambition: m.traits?.ambition ?? 50,
      loyalty: m.traits?.loyalty ?? 50,
      professionalism: m.traits?.professionalism ?? 50,
      mentality: m.traits?.mentality ?? 50,
    },
  })),
})
```

- [ ] **Step 6: 빌드 확인 후 커밋**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/utils/potential.ts src/data/mercenaries.ts src/hooks/useGameLoop.ts src/hooks/useSaveLoad.ts
git commit -m "feat: potential system + magic stones (dungeon/monster drop)"
```

---

## Task 5: 나이/성격 시스템 (features 7, 8)

**Files:**
- Create: `src/utils/retirement.ts`
- Modify: `src/data/mercenaries.ts` (Traits에 성격 필드 포함 생성)
- Modify: `src/hooks/useGameLoop.ts` (데일리 틱: 은퇴 체크, 성격 효과)

- [ ] **Step 1: src/utils/retirement.ts 생성**

```typescript
// src/utils/retirement.ts
import type { Mercenary } from '../types'

/**
 * 나이 경계 시 은퇴 확률 계산
 * age < 40: 0%
 * age 40~54: (age - 40) * 3%
 * age 55+: 파견 불가이므로 별도 처리 불필요
 */
export function calcRetirementChance(m: Mercenary, currentMorale: number): number {
  if (m.age < 40) return 0
  const baseChance = Math.min(0.45, (m.age - 40) * 0.03)
  // 사기 저하 시 추가 (나이 35+ 이고 사기 < 20)
  const moralePenalty = (m.age >= 35 && m.favorability < 20) ? 0.20 : 0
  // 충성도 높으면 감소
  const loyaltyMod = m.traits.loyalty > 70 ? 0.5 : 1.0
  return Math.min(0.85, (baseChance + moralePenalty) * loyaltyMod)
}

/**
 * 레벨업 시 나이별 성장 배율
 */
export function growthMultiplier(age: number): number {
  if (age < 30) return 1.0
  if (age < 40) return 0.8
  return 0.5
}

/**
 * 이탈 조건 판정 (호감도 임계치)
 * 충성도 낮으면 이탈 기준이 높음
 */
export function getDefectionThreshold(loyalty: number): number {
  if (loyalty >= 70) return 15   // 충성파: 15까지 버팀
  if (loyalty >= 40) return 25   // 보통: 25 이하면 이탈 위험
  return 35                       // 비충성: 35 이하면 이탈 위험
}
```

- [ ] **Step 2: mercenaries.ts 의 generateMercenary 에 성격 필드 랜덤 생성**

`generateMercenary` 함수에서 `traits` 생성 부분:
```typescript
traits: {
  cooperation: raceMod.cooperation + Math.floor(Math.random() * 20) - 10,
  ego:         40 + Math.floor(Math.random() * 60),
  gender:      Math.random() < 0.5 ? '남' : '여',
  synergy_factor: raceMod.synergy + (Math.random() * 0.2 - 0.1),
  // FM 성격 (랜덤 생성)
  ambition:        20 + Math.floor(Math.random() * 80),  // 20~100
  loyalty:         10 + Math.floor(Math.random() * 90),  // 10~100
  professionalism: 20 + Math.floor(Math.random() * 80),  // 20~100
  mentality:       20 + Math.floor(Math.random() * 80),  // 20~100
},
```

- [ ] **Step 3: useGameLoop.ts 데일리 틱에 나이/성격 효과 추가**

일 경과 처리 함수에:
```typescript
import { calcRetirementChance, growthMultiplier, getDefectionThreshold } from '../utils/retirement'

// 데일리 틱 용병 처리
nextMercs = nextMercs.map(m => {
  if (m.status === '파견중') return m
  let updated = { ...m }

  // 프로의식 자가 회복
  if (m.traits.professionalism >= 80) {
    updated = { ...updated, condition: Math.min(100, updated.condition + 2) }
  }

  // 야망: N일 비파견 시 불만
  const newIdleDays = m.status !== '파견중' ? (m.idleDays ?? 0) + 1 : 0
  updated = { ...updated, idleDays: newIdleDays }
  if (newIdleDays >= IDLE_AMBITION_THRESHOLD && m.traits.ambition >= 70) {
    updated = { ...updated, favorability: Math.max(0, updated.favorability - 3) }
    if (newIdleDays === IDLE_AMBITION_THRESHOLD) {
      logs.push(`😤 ${m.name} 비활약 불만 (야망 높음)`)
    }
  }

  // 이탈 체크
  const defThreshold = getDefectionThreshold(m.traits.loyalty)
  if (updated.favorability <= defThreshold && m.traits.loyalty < 40) {
    if (Math.random() < 0.1) {
      logs.push(`💨 ${m.name}이(가) 길드를 떠났습니다. (호감도 낮음)`)
      return { ...updated, status: '영혼' }  // 이탈 처리
    }
  }

  return updated
})

// 이탈한 용병 제거
nextMercs = nextMercs.filter(m => m.status !== '영혼')
```

- [ ] **Step 4: 나이 경계 시 은퇴 체크 (30일마다 나이+1 처리 부분에 추가)**

기존 나이 증가 로직 이후:
```typescript
// 나이 증가 후 은퇴 체크
for (const m of nextMercs.filter(m => m.age >= 40)) {
  const retireChance = calcRetirementChance(m, morale)
  if (retireChance > 0 && Math.random() < retireChance) {
    logs.push(`🏠 ${m.name}(${m.age}세)이(가) 은퇴를 선언했습니다.`)
    nextMercs = nextMercs.filter(nm => nm.id !== m.id)
  }
}
```

- [ ] **Step 5: 레벨업 시 나이별 성장률 적용**

useGameLoop 레벨업 블록에서 `sb` (stat boost) 계산 시:
```typescript
import { growthMultiplier } from '../utils/retirement'

const growMult = growthMultiplier(m.age)
const sb = level - m.level  // 레벨 상승 수
const statGain = Math.round(sb * growMult)  // 나이 보정 적용
return {
  ...m, level, experience: exp, expToNext,
  favorability: Math.min(100, m.favorability + 5),
  power: m.power + statGain * 4,
  trap_disarm: m.trap_disarm + statGain * 2,
  stats: {
    공격력: m.stats.공격력 + statGain * 2,
    함정해제: m.stats.함정해제 + statGain * 2,
    생존율: m.stats.생존율 + statGain * 2,
    협조성: m.stats.협조성 + statGain,
  }
}
```

- [ ] **Step 6: 퀘스트 실패 시 멘탈 시스템 적용**

실패 블록의 호감도 페널티 계산 부분:
```typescript
// 멘탈 높으면 실패 페널티 감소
const mentalMod = m.traits.mentality >= 80 ? 0.7 : 1.0
return { ...m, favorability: Math.max(0, m.favorability - Math.round((5 + wagePenalty) * mentalMod)) }
```

- [ ] **Step 7: 빌드 확인 후 커밋**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/utils/retirement.ts src/data/mercenaries.ts src/hooks/useGameLoop.ts
git commit -m "feat: age retirement + FM personality system (ambition/loyalty/professionalism/mentality)"
```

---

## Task 6: 전문성 태그 시스템 (feature 9)

**Files:**
- Create: `src/utils/specialty.ts`
- Modify: `src/hooks/useGameLoop.ts` (퀘스트 완료 시 태그 체크)
- Modify: `src/utils/quest.ts` (태그 보너스 반영)

- [ ] **Step 1: src/utils/specialty.ts 생성**

```typescript
// src/utils/specialty.ts
import type { Mercenary, SpecialtyTag, QuestType, Quest } from '../types'

interface TagCondition {
  questType?: QuestType
  minDeathRisk?: number
  partySize?: number
  maxCondition?: number
  element?: string
  requiredCount: number
}

const TAG_CONDITIONS: Record<SpecialtyTag, TagCondition> = {
  dungeon_veteran:  { questType: 'dungeon',  requiredCount: 3 },
  escort_expert:    { questType: 'escort',   requiredCount: 3 },
  trap_specialist:  { questType: 'trap',     requiredCount: 5 },
  survivor:         { minDeathRisk: 0.30,    requiredCount: 5 },
  lone_wolf:        { partySize: 1,          requiredCount: 3 },
  iron_will:        { maxCondition: 30,      requiredCount: 3 },
  beast_slayer:     { questType: 'monster',  requiredCount: 5 },  // hunt도 포함
  shadow_walker:    { element: '암흑',       requiredCount: 5 },
}

/** 퀘스트 완료 후 questHistory 업데이트 */
export function updateQuestHistory(
  m: Mercenary,
  quest: Quest,
  partySize: number
): Mercenary {
  const key = quest.questType
  const history = { ...m.questHistory, [key]: (m.questHistory[key] ?? 0) + 1 }

  // beast_slayer: hunt도 monster 카운터에 포함
  if (quest.questType === 'hunt') {
    history['monster'] = (history['monster'] ?? 0) + 1
  }

  return { ...m, questHistory: history }
}

/** 새로 얻을 태그 목록 반환 */
export function checkNewTags(
  m: Mercenary,
  quest: Quest,
  partySize: number,
  survived: boolean
): SpecialtyTag[] {
  if (!survived) return []
  const newTags: SpecialtyTag[] = []
  for (const [tag, cond] of Object.entries(TAG_CONDITIONS) as [SpecialtyTag, TagCondition][]) {
    if (m.specialtyTags.includes(tag)) continue
    let count = 0
    if (cond.questType) {
      count = m.questHistory[cond.questType] ?? 0
      if (cond.questType === 'monster') {
        count = (m.questHistory['monster'] ?? 0)
      }
    } else if (cond.minDeathRisk && quest.deathRisk >= cond.minDeathRisk) {
      count = (m.questHistory['_highRisk'] ?? 0)
    } else if (cond.partySize && partySize <= cond.partySize) {
      count = (m.questHistory['_solo'] ?? 0)
    } else if (cond.maxCondition && m.condition <= cond.maxCondition) {
      count = (m.questHistory['_lowCond'] ?? 0)
    } else if (cond.element && quest.element === cond.element && m.element === cond.element) {
      count = (m.questHistory['_shadow'] ?? 0)
    }
    if (count >= cond.requiredCount) newTags.push(tag)
  }
  return newTags
}

/** 태그에 따른 calcSuccessRate 보정값 반환 */
export function tagSuccessBonus(m: Mercenary, quest: Quest, partySize: number): number {
  let bonus = 0
  for (const tag of m.specialtyTags) {
    switch (tag) {
      case 'dungeon_veteran':
        if (quest.questType === 'dungeon') bonus += 12; break
      case 'escort_expert':
        if (quest.questType === 'escort') bonus += 10; break
      case 'trap_specialist':
        if (quest.trapFocus) bonus += 8; break
      case 'beast_slayer':
        if (quest.questType === 'monster' || quest.questType === 'hunt') bonus += 10; break
      case 'shadow_walker':
        if (quest.element === '암흑' && m.element === '암흑') bonus += 5; break
      case 'lone_wolf':
        if (partySize === 1) bonus += 15; break
      case 'iron_will':
        // 컨디션 낮아도 파견 가능 → success bonus 없음, death risk에서 처리
        break
    }
  }
  return bonus
}

/** 태그에 따른 calcMercDeathRisk 배율 반환 */
export function tagDeathRiskMult(m: Mercenary, quest: Quest): number {
  let mult = 1.0
  for (const tag of m.specialtyTags) {
    switch (tag) {
      case 'dungeon_veteran':
        if (quest.questType === 'dungeon') mult *= 0.85; break
      case 'survivor': mult *= 0.80; break
      case 'iron_will': mult *= 0.85; break
    }
  }
  return mult
}
```

- [ ] **Step 2: quest.ts calcSuccessRate / calcMercDeathRisk 에 태그 보너스 연결**

`calcSuccessRate` 함수 마지막 return 전:
```typescript
import { tagSuccessBonus } from './specialty'
// 태그 보너스 (용병별 합산)
for (const m of assigned) {
  rate = Math.min(95, rate + tagSuccessBonus(m, quest, assigned.length))
}
```

`calcMercDeathRisk` 함수 return 전:
```typescript
import { tagDeathRiskMult } from './specialty'
risk *= tagDeathRiskMult(merc, quest)
```

- [ ] **Step 3: useGameLoop 성공 블록에 questHistory 업데이트 + 태그 획득 처리**

```typescript
import { updateQuestHistory, checkNewTags } from '../utils/specialty'

// 성공 후 용병 업데이트 시
nextMercs = nextMercs.map(m => {
  if (!aq.assignedMercIds.includes(m.id)) return m
  const withHistory = updateQuestHistory(m, quest, aq.assignedMercIds.length)
  const newTags = checkNewTags(withHistory, quest, aq.assignedMercIds.length, true)
  if (newTags.length > 0) {
    newTags.forEach(tag => logs.push(`🏷 ${m.name} 전문성 획득: [${SPECIALTY_TAG_DESC[tag].label}]`))
  }
  return { ...withHistory, specialtyTags: [...withHistory.specialtyTags, ...newTags] }
})
```

- [ ] **Step 4: 특수 questHistory 키 업데이트 (highRisk, solo, lowCond, shadow)**

`updateQuestHistory` 함수에 추가:
```typescript
if (quest.deathRisk >= 0.30) {
  history['_highRisk'] = (history['_highRisk'] ?? 0) + 1
}
if (partySize === 1) {
  history['_solo'] = (history['_solo'] ?? 0) + 1
}
// lowCond, shadow는 useGameLoop에서 m.condition 체크 후 별도 업데이트
```

- [ ] **Step 5: 빌드 확인 후 커밋**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/utils/specialty.ts src/utils/quest.ts src/hooks/useGameLoop.ts
git commit -m "feat: specialty tag system - hidden achievement tags with stat bonuses"
```

---

## Task 7: 의뢰인 NPC 시스템 (feature 10)

**Files:**
- Create: `src/data/clients.ts`
- Modify: `src/hooks/useGameLoop.ts` (관계도 갱신)
- Modify: `src/utils/quest.ts` (관계도 반영 보너스)

- [ ] **Step 1: src/data/clients.ts 생성**

```typescript
// src/data/clients.ts
import type { Client } from '../types'

export const ALL_CLIENTS: Client[] = [
  {
    id: 'merchant',
    name: '상인 연합',
    faction: 'merchant',
    icon: '🪙',
    description: '아이언홀드 주요 무역로를 관리하는 상인 길드.',
    questBonus: 15,
  },
  {
    id: 'noble',
    name: '귀족 가문',
    faction: 'noble',
    icon: '⚜️',
    description: '도시 북쪽 저택가의 귀족 연합.',
    questBonus: 12,
  },
  {
    id: 'church',
    name: '성광 교단',
    faction: 'church',
    icon: '🕊️',
    description: '빛의 신을 섬기는 교단. 치유와 정화 의뢰를 주로 낸다.',
    questBonus: 10,
  },
  {
    id: 'military',
    name: '왕국 군부',
    faction: 'military',
    icon: '🛡',
    description: '왕국 북방 수비대. 대규모 토벌 의뢰를 낸다.',
    questBonus: 20,
  },
  {
    id: 'mage',
    name: '마법사 탑',
    faction: 'mage',
    icon: '🔮',
    description: '고대 유물과 마법 연구를 후원하는 마법사 조합.',
    questBonus: 18,
  },
  {
    id: 'rogue',
    name: '그림자 길드',
    faction: 'rogue',
    icon: '🗡️',
    description: '표면 아래에서 암약하는 정보 조직.',
    questBonus: 22,
  },
  {
    id: 'guild',
    name: '용병 조합',
    faction: 'merchant',
    icon: '📜',
    description: '길드 내부 훈련·교류 의뢰를 관리하는 자체 조합.',
    questBonus: 8,
  },
]

export const getClient = (id: string): Client | undefined =>
  ALL_CLIENTS.find(c => c.id === id)

/** 관계도에 따른 금화 보너스 배율 */
export function clientGoldBonus(relation: number, questBonus: number): number {
  if (relation >= 80) return questBonus / 100  // e.g. +15%
  if (relation >= 50) return 0
  return 0
}

/** 관계도에 따른 명성 패널티 배율 (실패 시) */
export function clientFamePenaltyMult(relation: number): number {
  if (relation <= 20) return 1.5  // 신뢰 낮으면 명성 피해 증폭
  if (relation >= 80) return 0.7  // 신뢰 높으면 명성 피해 감소
  return 1.0
}

/** 관계도 초기값 */
export const INITIAL_CLIENT_RELATION = 50
```

- [ ] **Step 2: useGameLoop 성공/실패 블록에 clientRelations 갱신 추가**

`useGameLoop`의 refs에 `clientRelations` 추가하고:
```typescript
// 성공 시
const clientId = quest.clientId
if (clientId) {
  const prev = clientRelations[clientId] ?? INITIAL_CLIENT_RELATION
  clientRelations[clientId] = Math.min(100, prev + 5)
  if (prev < 80 && clientRelations[clientId] >= 80) {
    logs.push(`🤝 [${getClient(clientId)?.name}] 신뢰도 최고! 보상 보너스 활성화`)
  }
  // 관계도 80+ 이면 gold 보너스
  const client = getClient(clientId)
  if (client && clientRelations[clientId] >= 80) {
    const bonus = Math.round(quest.reward.gold * client.questBonus / 100)
    g += bonus
    logs.push(`🪙 [${client.name}] 관계 보너스 +${bonus}G`)
  }
}

// 실패 시
if (clientId) {
  const prev = clientRelations[clientId] ?? INITIAL_CLIENT_RELATION
  const penaltyMult = clientFamePenaltyMult(prev)
  const adjustedFameLoss = Math.round((quest.famePenalty ?? 0) * penaltyMult)
  fame = Math.max(0, fame - adjustedFameLoss)
  clientRelations[clientId] = Math.max(0, prev - 10)
  if (clientRelations[clientId] === 0) {
    logs.push(`❗ [${getClient(clientId)?.name}] 신뢰도 바닥! 의뢰 중단 위험`)
  }
}
```

- [ ] **Step 3: SaveSlotData에서 clientRelations 유지 (이미 Task 4에서 migration 추가됨)**

`useGameLoop` refs에 `clientRelations` 추가:
```typescript
interface GameLoopRefs {
  // 기존 필드 유지
  clientRelations: Record<string, number>
}
```

그리고 setState/callback에서 clientRelations도 업데이트되도록 연결.

- [ ] **Step 4: 빌드 확인 후 커밋**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/data/clients.ts src/hooks/useGameLoop.ts
git commit -m "feat: client NPC system - relations, gold bonus, fame penalty modifier"
```

---

## Task 8: 퀘스트 보고서 + 피로 시스템 + 퀘스트 특징 (features 12, 13, 14, 15)

**Files:**
- Create: `src/utils/report.ts`
- Modify: `src/hooks/useGameLoop.ts` (보고서 생성, 피로 업데이트, 특징 처리)
- Modify: `src/utils/quest.ts` (파견 시간 비례 피로 계산)

- [ ] **Step 1: src/utils/report.ts 생성**

```typescript
// src/utils/report.ts
import type { Mercenary, Quest, QuestReport } from '../types'
import { effPower } from './power'

export function generateQuestReport(
  quest: Quest,
  assignedMercs: Mercenary[],
  success: boolean,
  deaths: string[]
): QuestReport {
  const survivors = assignedMercs.filter(m => !deaths.includes(m.id))
  if (survivors.length === 0) {
    return {
      questId: quest.id, questName: quest.name, success,
      mercPerformance: {}, bonusApplied: false, timestamp: Date.now(),
    }
  }
  const powers = survivors.map(m => ({ id: m.id, power: effPower(m) }))
  const avg = powers.reduce((s, p) => s + p.power, 0) / powers.length
  const mvp = powers.reduce((a, b) => a.power > b.power ? a : b)
  const poor = powers.reduce((a, b) => a.power < b.power ? a : b)

  const performance: Record<string, 'excellent' | 'normal' | 'poor'> = {}
  for (const { id, power } of powers) {
    if (power >= avg * 1.3) performance[id] = 'excellent'
    else if (power <= avg * 0.7) performance[id] = 'poor'
    else performance[id] = 'normal'
  }

  return {
    questId: quest.id,
    questName: quest.name,
    success,
    mvpId: survivors.length > 1 ? mvp.id : undefined,
    poorPerformerId: survivors.length > 1 && poor.id !== mvp.id ? poor.id : undefined,
    mercPerformance: performance,
    bonusApplied: false,
    timestamp: Date.now(),
  }
}

/** 플레이어가 MVP에게 보너스 지급 */
export function applyReportBonus(
  report: QuestReport,
  mercId: string,
  bonusType: 'exp' | 'favorability',
  mercs: Mercenary[]
): Mercenary[] {
  const BONUS_AMOUNTS = { exp: 30, favorability: 8 }
  const amount = BONUS_AMOUNTS[bonusType]
  return mercs.map(m => {
    if (m.id !== mercId) return m
    if (bonusType === 'exp') {
      return { ...m, experience: m.experience + amount }
    } else {
      return { ...m, favorability: Math.min(100, m.favorability + amount) }
    }
  })
}
```

- [ ] **Step 2: useGameLoop 성공/실패 블록 끝에 보고서 생성 추가**

```typescript
import { generateQuestReport } from '../utils/report'

// 각 퀘스트 처리 끝부분
const report = generateQuestReport(quest, assignedMercs, success, deadIds)
pendingReports.push(report)
```

`GameLoopRefs`에 `pendingReports`와 setter 추가.

- [ ] **Step 3: 연속 파견 피로 (feature 13) — 파견 시작 시 consecutiveDispatches 업데이트**

파견 시작(dispatch) 함수에서 (App.tsx 또는 해당 핸들러):
```typescript
// 파견 시작 시 용병 consecutiveDispatches 갱신
setMercs(prev => prev.map(m => {
  if (!assignedIds.includes(m.id)) return m
  const isConsecutive = (currentDay - m.lastDispatchEndDay) <= 1
  return {
    ...m,
    status: '파견중',
    consecutiveDispatches: isConsecutive ? m.consecutiveDispatches + 1 : 1,
  }
}))
```

퀘스트 완료 시 `lastDispatchEndDay` 갱신:
```typescript
// 완료 처리 후
nextMercs = nextMercs.map(m => {
  if (!aq.assignedMercIds.includes(m.id)) return m
  return { ...m, lastDispatchEndDay: state.day, idleDays: 0 }
})
```

드워프는 번아웃 임계치 +1:
```typescript
const burnoutThreshold = m.race === '드워프' ? 4 : CONSECUTIVE_DISPATCH_BURNOUT
const isBurnout = m.consecutiveDispatches >= burnoutThreshold
```

`effPower`에서 번아웃 배율 적용 (Task 3 Step 2에서 이미 연결됨).

- [ ] **Step 4: 퀘스트 특징 강화 (feature 14) — 퀘스트 타입별 추가 효과**

성공 블록 내:
```typescript
// 퀘스트 타입별 특수 보상
switch (quest.questType) {
  case 'hunt':
  case 'combat':
    // 산적/전투: 명성 보너스 +30%
    const extraFame = Math.round(quest.reward.fame * 0.3)
    fame += extraFame
    if (extraFame > 0) logs.push(`⭐ 전투 명성 보너스 +${extraFame}`)
    break
  case 'escort':
    // 호위: 상인 관계 자동 +3 추가 (clientRelations에서 +5 외에 추가)
    if (clientRelations['merchant'] !== undefined) {
      clientRelations['merchant'] = Math.min(100, clientRelations['merchant'] + 3)
    }
    break
  case 'support':
    // 지원: 모랄 추가 회복
    morale = Math.min(100, morale + 3)
    break
  case 'dungeon':
  case 'monster':
    // 이미 마석 드랍 처리됨 (Task 4 Step 3)
    break
}
```

- [ ] **Step 5: 파견 시간 비례 피로 (feature 15) — calcQuestDurationMs 기반 drain 조정**

`src/utils/quest.ts` 의 `calcQuestDurationMs` 이후, drain 계산 헬퍼 추가:
```typescript
/** 실제 클리어 시간 비율에 따른 conditionDrain 보정
 *  빠르게 끝내면 피로 감소, 느리면 피로 증가 */
export function calcActualConditionDrain(
  quest: Quest,
  actualDurationMs: number,
  assignedMercs: Mercenary[]
): number {
  const baseMins = QUEST_BASE_TIMES_MIN[Math.min(quest.duration - 1, 7)]
  const baseMs = baseMins * 60 * 1000
  const ratio = actualDurationMs / baseMs  // 1.0 = 기본, 0.3 = 최대 단축
  // ratio에 비례하여 drain 조정 (최소 40%, 최대 150%)
  const drainMult = Math.max(0.4, Math.min(1.5, ratio))
  return Math.round(quest.conditionDrain * drainMult)
}
```

`useGameLoop.ts`에서 drain 적용 부분:
```typescript
import { calcActualConditionDrain } from '../utils/quest'

// 기존: const drain = quest.conditionDrain
// 변경:
const actualDrain = calcActualConditionDrain(quest, aq.durationMs, assignedMercs)
const drain = (m.element === '얼음' && quest.element === '얼음')
  ? Math.round(actualDrain * 0.5)
  : actualDrain
```

- [ ] **Step 6: 빌드 확인 후 커밋**

```bash
npx tsc --noEmit 2>&1 | head -20
git add src/utils/report.ts src/utils/quest.ts src/hooks/useGameLoop.ts
git commit -m "feat: quest report + consecutive fatigue + quest type bonuses + time-proportional drain"
```

---

## Task 9: SaveSlotData 완전 통합 + 최종 빌드

**Files:**
- Modify: `src/hooks/useSaveLoad.ts` (모든 신규 필드 저장/로드)
- Modify: `src/hooks/useGameLoop.ts` (refs/callbacks 최종 정리)

- [ ] **Step 1: useGameLoop 인터페이스에 신규 refs/callbacks 모두 추가**

```typescript
interface GameLoopRefs {
  mercs: Mercenary[]
  state: CampaignState
  buildings: GuildBuildings
  roomLevels: Record<string, number>
  activeQuests: ActiveQuest[]
  clientRelations: Record<string, number>   // 추가
  urgentQuestIds: string[]                   // 추가
  urgentQuestExpiries: Record<string, number> // 추가
}

interface GameLoopCallbacks {
  setMercs: React.Dispatch<React.SetStateAction<Mercenary[]>>
  setState: React.Dispatch<React.SetStateAction<CampaignState>>
  setActiveQuests: React.Dispatch<React.SetStateAction<ActiveQuest[]>>
  setQuestLog: React.Dispatch<React.SetStateAction<string[]>>
  setShowLogModal: React.Dispatch<React.SetStateAction<boolean>>
  setClientRelations: React.Dispatch<React.SetStateAction<Record<string, number>>> // 추가
  setPendingReports: React.Dispatch<React.SetStateAction<QuestReport[]>>           // 추가
  onQuestResult: (success: boolean, deaths: number) => void
}
```

- [ ] **Step 2: App.tsx에서 신규 state 선언 및 useGameLoop 호출 업데이트**

App.tsx에서:
```typescript
const [clientRelations, setClientRelations] = useState<Record<string, number>>({})
const [urgentQuestIds, setUrgentQuestIds] = useState<string[]>([])
const [urgentQuestExpiries, setUrgentQuestExpiries] = useState<Record<string, number>>({})
const [pendingReports, setPendingReports] = useState<QuestReport[]>([])
const [magicStones, setMagicStones] = useState(0)

// useGameLoop 호출 시 refs/callbacks에 신규 항목 추가
```

- [ ] **Step 3: useSaveLoad.ts 저장/불러오기에 신규 필드 포함**

저장 시:
```typescript
const saveData: SaveSlotData = {
  // ...기존 필드
  clientRelations,
  urgentQuestIds,
  urgentQuestExpiries,
  pendingReports,
}
```

불러오기 시 Task 4 Step 5의 `migrateSave` 함수 활용.

- [ ] **Step 4: 릴리스 빌드 실행**

```bash
cd C:/Development/4_GM && node scripts/build-release.js
```

성공 시: `release/GM-v1.1.43.html` 생성 확인

- [ ] **Step 5: 수동 검증 체크리스트**

```
[ ] 새 게임 시작 → 용병 3명 생성 확인 (potential, personality, specialtyBonuses 필드 포함)
[ ] 퀘스트 실패 → 명성 감소 로그 확인
[ ] 명성 0에서 도착 용병 → D/C급 비율 높은지 확인
[ ] 마법훈련소 방 설치 후 마법사 배치 → 퀘스트 배치 화면에 elementBonus 반영 확인
[ ] 던전 퀘스트 성공 → 15% 확률로 마석 획득 로그 확인
[ ] 용병 Lv5 달성 → 잠재력 공개 로그 확인
[ ] 같은 용병 3회 연속 파견 → effPower ×0.85 확인
[ ] 퀘스트 완료 후 pendingReports에 보고서 추가 확인
[ ] 세이브/로드 → 신규 필드 모두 유지되는지 확인
```

- [ ] **Step 6: 최종 커밋**

```bash
git add -A
git commit -m "feat: complete systems overhaul v1.1.43 - fame/training/potential/personality/specialty/client/report/fatigue"
```

---

## Task 10: 기획서 업데이트

**Files:**
- Modify: `docs/기획서.html`

- [ ] **Step 1: 기획서에 신규 시스템 섹션 추가**

아래 섹션을 기획서에 추가:

1. **잠재력 시스템** — maxGrade (숨김), 자동 공개(Lv5), 마석으로 강제 공개/리롤/각성
2. **마석** — 드랍 조건(몬스터/던전 15%), 용도 3가지
3. **FM 성격** — 야망/충성도/프로의식/멘탈 설명표
4. **전문성 태그** — 8종 태그, 달성 조건, 효과표
5. **의뢰인 NPC** — 7개 의뢰인, 관계도 시스템
6. **훈련소 세분화** — 마법/레인저/전사 훈련소 효과표
7. **퀘스트 보고서** — MVP, 활약/부진, 플레이어 보너스
8. **피로 시스템** — 연속 파견 번아웃, 시간 비례 컨디션 소모
9. **명성 개편** — 실패 명성 감소, 등급 가중치, 긴급 의뢰

버전 날짜: v1.1.43 · 2026-04-29

- [ ] **Step 2: 빌드 후 기획서 커밋**

```bash
node scripts/build-release.js
git add docs/기획서.html
git commit -m "docs: 기획서 v1.1.43 최신화 (15개 시스템 추가)"
```

---

## 구현 순서 요약

```
Task 1 (Types)
  ↓
Task 2 (명성) ← Task 1 완료 후
  ↓
Task 3 (훈련소/직업) ← Task 1 완료 후 (Task 2와 병렬 가능)
  ↓
Task 4 (잠재력/마석) ← Task 1, 2 완료 후
  ↓
Task 5 (나이/성격) ← Task 1 완료 후 (Task 4와 병렬 가능)
  ↓
Task 6 (전문성) ← Task 2, 4, 5 완료 후
  ↓
Task 7 (의뢰인) ← Task 2 완료 후 (Task 6과 병렬 가능)
  ↓
Task 8 (보고서/피로/특징) ← Task 6, 7 완료 후
  ↓
Task 9 (통합/빌드) ← 모든 Task 완료 후
  ↓
Task 10 (기획서) ← Task 9 완료 후
```

---

## 자기 검토 — 스펙 커버리지

| 기능 | 담당 Task | 커버됨 |
|------|----------|--------|
| 1. 퀘스트 실패 명성 감소 | Task 2 | ✅ `famePenalty` 필드 + useGameLoop |
| 2. 명성 낮으면 나쁜 용병 | Task 2 | ✅ `gradeWeightsByFame` |
| 3. 훈련소 세분화 | Task 3 | ✅ 3종 새 룸 + 일별 버프 |
| 4. 직업/종족 개선 | Task 3 | ✅ 도적 탈출, 마법사 고레벨, 인간 케미, 드워프 번아웃+1 |
| 5. 명성 높으면 긴급 의뢰 | Task 2 | ✅ `isUrgentEligible` + 만료 페널티 |
| 6. 잠재력 시스템 | Task 4 | ✅ `Potential` + 자동 공개 + 마석 각성 |
| 7. 나이 시스템 개선 | Task 5 | ✅ 은퇴 확률 + 성장률 감소 + 사기 은퇴 |
| 8. FM 성격 | Task 5 | ✅ 야망/충성도/프로의식/멘탈 |
| 9. 전문성 태그 | Task 6 | ✅ 8종 태그 + questHistory 추적 |
| 10. 의뢰인 NPC | Task 7 | ✅ 7명 의뢰인 + 관계도 + 보상 배율 |
| 11. 마석 | Task 4 | ✅ 드랍 + 공개/리롤/각성 3용도 |
| 12. 퀘스트 보고서 | Task 8 | ✅ MVP + 활약/부진 + 플레이어 보너스 |
| 13. 연속 파견 피로 | Task 8 | ✅ `consecutiveDispatches` + 번아웃 배율 |
| 14. 퀘스트 특징 강화 | Task 8 | ✅ 타입별 추가 보상 (명성/관계/모랄/마석) |
| 15. 파견 시간 비례 피로 | Task 8 | ✅ `calcActualConditionDrain` |
