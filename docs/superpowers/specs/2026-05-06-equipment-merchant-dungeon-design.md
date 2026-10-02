# Equipment, Merchant, Dungeon System Design
**Date:** 2026-05-06
**Project:** 4_GM — 아이언홀드 용병단 길드
**Status:** Approved

---

## Overview

Three interconnected systems added to the guild management game:
1. **Equipment System** — per-mercenary gear with stats, passives, set bonuses
2. **Visiting Merchant** — periodic NPC selling equipment
3. **Dungeon System** — multi-floor optional content triggered by quests

Equipment is the foundation; merchant and dungeon are acquisition channels.

---

## Architecture

**Approach:** Independent components + hooks. App.tsx handles state coordination only.

### New Files

```
src/
  data/
    equipment.ts        # Item pool (~100 items), set definitions
    dungeons.ts         # Dungeon name pool, floor scaling
  components/
    EquipmentModal.tsx  # Per-merc equipment management UI
    MerchantPanel.tsx   # Visiting merchant modal
    DungeonPanel.tsx    # Dungeon progress + dispatch UI
  hooks/
    useMerchant.ts      # Merchant arrival/departure timing
    useDungeon.ts       # Dungeon state management
```

### Existing Changes

- `src/types.ts` — add Equipment, SetDefinition, PassiveEffect, Dungeon types; modify Mercenary
- `src/data/equipment.ts` — replaces existing weapon tier system entirely
- `src/App.tsx` — state wiring, remove old weaponId/WEAPONS logic

---

## 1. Equipment System

### Type Definitions

```ts
type EquipSlot = 'weapon' | 'head' | 'body' | 'accessory'
type EquipGrade = 'D' | 'C' | 'B' | 'A' | 'S'

interface PassiveEffect {
  type:
    | 'quest_success_morale'     // 퀘스트 성공 시 사기 +N
    | 'same_element_death_resist'// 속성 일치 퀘스트에서 사망률 -N%
    | 'trap_bonus'               // 함정 퀘스트 성공률 +N%
    | 'survival_bonus'           // 생존율 +N (추가)
    | 'morale_recovery_on_kill'  // 퀘스트 성공 시 사기 회복 +N
    | 'guild_fame_bonus'         // 퀘스트 성공 명성 +N
  value: number
  condition?: string             // UI 표시용 발동 조건 텍스트
}

interface SetBonus {
  requiredCount: 2 | 3 | 4
  description: string
  effects: PassiveEffect[]
}

interface Equipment {
  id: string                               // 예: 'eq_w_iron_sword_b'
  name: string
  slot: EquipSlot
  grade: EquipGrade
  setId?: string                           // 세트 귀속
  // 스탯 보너스
  powerBonus: number
  atkBonus: number
  trapBonus: number
  survBonus: number
  moraleBonus: number                      // 착용 중 사기 상한 보정
  // 직업 친화 보너스 (선택적)
  classBonus?: Partial<Record<MercenaryClass, number>>
  passive?: PassiveEffect
  buyCost: number                          // 기준 구매가
  icon: string                             // 이모지
}

interface SetDefinition {
  id: string
  name: string
  bonuses: SetBonus[]
}
```

### Mercenary Type Change

```ts
// 기존 weaponId: string → 제거
equipment: {
  weapon:    string | null   // Equipment.id
  head:      string | null
  body:      string | null
  accessory: string | null
}
```

### Item Pool — `src/data/equipment.ts`

슬롯별 5종 × 5등급 = 100종. 세트는 4종 정의.

| 세트명 | 친화 직업 | 2세트 효과 | 3세트 효과 |
|---|---|---|---|
| 그림자 세트 | 도적 | 함정해제 +8 | 암흑 퀘 성공률 +12% |
| 철벽 세트 | 전사 | 생존율 +10 | 사망 위험 -20% |
| 현자 세트 | 마법사 | 전력 +15 | 속성 일치 시 추가 명성 +3 |
| 자연 세트 | 궁수/성직자 | 사기 +10 | 퀘스트 성공 사기 회복 +5 |

### SaveSlotData Changes

```ts
guildInventory: Equipment[]   // 최대 40슬롯
```

### Effective Power Calculation

기존 `effPower` 에 장비 보너스 적용:
```
equippedPower = sum of all equipment.powerBonus + (equipment.classBonus[m.class] ?? 0)
effPower += equippedPower
```

`classBonus`는 슬롯별로 각각 체크하며 합산. 직업이 해당 장비의 친화 직업과 일치할 때만 적용.

패시브 효과는 퀘스트 성공률/사망 위험 계산 시 적용.
세트 효과는 착용한 setId 일치 장비 수 기준으로 발동.

---

## 2. Quest Drop System

### Drop Probability by Quest Tier

| 퀘스트 티어 | 드롭 확률 | 장비 등급 |
|---|---|---|
| Lv1 (단기/쉬움) | 8% | D, C |
| Lv2 | 12% | C, B |
| Lv3 | 18% | B, A |
| Lv4 | 25% | A, S |
| Lv5 (드래곤) | 40% | A, S |

### Quest Result Modal Extension

드롭 발생 시 기존 결과 모달 하단에 추가:

```
┌──────────────────────────────────┐
│  🎁 전리품 획득!                  │
│  [철벽의 투구 B등급]              │
│  생존율 +6 / 패시브: 사망확률 -8% │
│  구매: 180G   [구매] [거절]       │
└──────────────────────────────────┘
```

- **구매:** 길드 인벤토리에 추가 (골드 차감)
- **거절:** 파티원 중 해당 슬롯 비어있거나 powerScore 낮은 용병 탐색
  → 조건 해당자 존재 시 70% 확률로 자동 장착, 기존 장비는 인벤토리로 반환, 사기 +8
  → 없으면 장비 소멸 (로그 기록)

`powerScore = powerBonus + atkBonus + trapBonus + survBonus`

---

## 3. Guild Inventory & Equipment Modal

### Guild Inventory

- 최대 40슬롯. 초과 시 신규 획득 불가 → "인벤토리 가득 참" 경고
- 인벤토리 아이템은 자유롭게 용병에게 장착/해제

### EquipmentModal.tsx

용병 상세 모달 또는 별도 버튼으로 접근:

```
┌─────────────────────────────────────┐
│  [카이강] 장비 관리                  │
│  ⚔ 무기:  철검 B        [해제]      │
│  🪖 머리:  (없음)        [장착]      │
│  🛡 몸통:  가죽 갑옷 C   [교체]      │
│  💍 장신구: (없음)       [장착]      │
│                                     │
│  세트 효과: 철벽 2세트 — 생존율 +10  │
├─────────────────────────────────────┤
│  길드 인벤토리 (12/40)               │
│  [철벽 투구B] [그림자검A] [현자링C]  │
│  (클릭 시 선택한 슬롯에 장착)         │
└─────────────────────────────────────┘
```

---

## 4. Visiting Merchant System

### Timing

| 속성 | 값 |
|---|---|
| 방문 주기 | 실시간 20분 (게임 내 4일) |
| 체류 시간 | 실시간 10분 (게임 내 2일) |
| 알림 | 로그 + 건물 패널 🛒 뱃지 |

### Inventory Generation

길드 레벨별 등급 가중치로 3~5종 랜덤 생성:

| 길드 레벨 | D | C | B | A | S |
|---|---|---|---|---|---|
| 1 | 50% | 40% | 10% | — | — |
| 2 | — | 40% | 40% | 20% | — |
| 3 | — | — | 30% | 50% | 20% |
| 4+ | — | — | — | 40% | 60% |

판매가 = `buyCost × 1.2` (상인 마진 20%)

### MerchantPanel.tsx

```
┌──────────────────────────────────────┐
│  🛒 행상인   [출발까지: 7분 23초]    │
├──────────────────────────────────────┤
│  [그림자 단검 A]                      │
│  공격 +12 / 함정 +8                  │
│  패시브: 암흑 퀘 성공률 +10%          │
│  420G                    [구매]      │
│                                      │
│  [철벽 투구 B]                        │
│  생존율 +6                            │
│  180G                    [구매]      │
└──────────────────────────────────────┘
```

- 구매 즉시 길드 인벤토리 추가
- 출발 후 패널 자동 닫힘, 뱃지 제거

### useMerchant.ts

`useEffect` + `setInterval`로 도착/출발 타이밍 관리.
상인 상태: `{ active: boolean; stock: Equipment[]; departsAt: number } | null`
SaveSlotData에 `merchantState` 포함하여 저장/복원.

---

## 5. Dungeon System

### Dungeon Trigger

퀘스트 완료 후 드롭 체크와 별도로 던전 발생 판정:

| 퀘스트 티어 | 확률 | 입장 가능 층 |
|---|---|---|
| Lv1 | 3% | 1~3층 |
| Lv2 | 5% | 2~5층 |
| Lv3 | 8% | 4~7층 |
| Lv4 | 12% | 6~10층 |
| Lv5 | 30% | 8~10층 |

동시 활성 던전: 최대 1개.

### Type Definitions

```ts
interface ActiveDungeon {
  id: string
  name: string
  maxFloor: number
  currentFloor: number      // 현재 도전 층 (1-indexed)
  clearedFloors: number
  element: Element
  status: 'active' | 'completed' | 'abandoned'
  activeDungeonQuestId?: string  // 현재 파견 중인 층의 ActiveQuest ID
}
```

### Floor Scaling

```
기준 난이도 = 퀘스트 난이도 × 0.8  (던전은 약간 쉽게 시작)
층별 난이도 = 기준 × (1 + floor × 0.3)
층별 사망위험 = 기준위험 × (1 + floor × 0.15)   // 최대 98% 캡

층별 보상:
  골드 = 층 × 80G
  XP   = 층 × 25
  장비 드롭: 5층 이상 (B~S 등급)

완전 클리어 보너스:
  골드 += maxFloor × 200G
  장비 1~2개 (A~S 등급) 길드 인벤토리 (인벤토리 가득 찰 경우 획득 불가 → 경고 로그)
  명성 += maxFloor × 5
```

### DungeonPanel.tsx

건물 패널 내 별도 탭 또는 알림 버튼으로 접근:

```
┌──────────────────────────────────────┐
│  🏚 잊혀진 지하 묘지   [3 / 7층]     │
│  ████████░░░░░░░░░░  진행도 43%     │
│                                      │
│  현재 층: 4층  난이도: 195           │
│  사망위험: 기본 18%  체류시간: 15분   │
│  보상: 320G / 50XP  🎁 장비 드롭 가능│
│                                      │
│  [파티 구성 후 파견]   [던전 포기]   │
└──────────────────────────────────────┘
```

- 파견은 일반 퀘스트와 동일 메커니즘 재활용
- 층 클리어 → `currentFloor++`, 보상 지급
- 마지막 층 클리어 → 완전 클리어 보너스 지급, 던전 종료
- 던전 포기 → 현재까지 보상 없음, 던전 소멸

### useDungeon.ts

던전 상태 관리, 층 완료 판정 (processCompletions에서 훅 호출).
SaveSlotData에 `activeDungeon: ActiveDungeon | null` 포함.

---

## Implementation Order

1. **타입 정의** — types.ts 수정
2. **장비 데이터** — equipment.ts 작성 (100종 + 4세트)
3. **effPower 수정** — 장비 보너스 반영
4. **인벤토리 + 장비 모달** — EquipmentModal.tsx
5. **퀘스트 드롭** — 결과 모달 확장
6. **방문 상인** — useMerchant.ts + MerchantPanel.tsx
7. **던전 발생** — 퀘스트 완료 후 판정 로직
8. **던전 진행** — useDungeon.ts + DungeonPanel.tsx
9. **저장 마이그레이션** — 기존 세이브 호환성
10. **빌드 + 테스트**
