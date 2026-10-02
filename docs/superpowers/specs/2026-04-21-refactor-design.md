# 4_GM 리팩터링 설계 문서

날짜: 2026-04-21

## 목표

App.tsx God Component 해소, localStorage 저장 슬롯 시스템 추가, 버그 수정 및 타입 안전성 강화, 빌드 산출물 git 정리.

---

## 1. 파일 구조 (기능별 폴더)

```
src/
  components/
    MercCard.tsx          # 용병 카드 UI
    QuestCard.tsx         # 퀘스트 카드 UI
    BuildingPanel.tsx     # 건물 관리 패널
    StatRadar.tsx         # (기존 유지)
    CondBar.tsx           # 컨디션 바
    SaveSlotScreen.tsx    # 슬롯 선택 화면
  hooks/
    useGameLoop.ts        # 실시간 타이머 (퀘스트 완료 체크)
    useSaveLoad.ts        # localStorage 저장/불러오기
  utils/
    power.ts              # effPower, combatPower 등 순수 함수
    quest.ts              # drawQuestPool (사이드 이펙트 제거)
    format.ts             # gradeText, gradeBg, favEmoji 등
  data/
    mercenaries.ts        # 초기 용병 데이터 (기존)
    quests.ts             # ALL_QUESTS 분리
    weapons.ts            # WEAPONS, DEFAULT_WEAPON 분리
    buildings.ts          # BUILDING_INFO, upgradeCost 등 상수
  constants.ts            # ELEMENT_ICON, RACE_ICONS 등 표시 상수
  types.ts                # 타입 정의 (기존 + RoomId 추가)
  App.tsx                 # 상태 선언 + 레이아웃 조합만
```

---

## 2. 저장 슬롯 시스템

### 데이터 구조

```typescript
interface SaveSlot {
  slotId: 1 | 2 | 3
  savedAt: number        // Unix timestamp ms
  day: number            // 현재 날짜 (슬롯 미리보기용)
  fame: number           // 명성 (슬롯 미리보기용)
  mercCount: number      // 용병 수 (슬롯 미리보기용)
  state: FullGameState   // 전체 게임 상태 직렬화
}
```

### localStorage 키

```
gm_save_slot_1
gm_save_slot_2
gm_save_slot_3
```

### 동작 흐름

1. 앱 실행 → `SaveSlotScreen` 표시
2. 빈 슬롯 클릭 → 새 게임 시작
3. 저장된 슬롯 클릭 → 해당 상태 불러와 게임 진입
4. 게임 중 상태 변경 시 → 디바운스 1초 후 해당 슬롯 자동저장
5. 게임 내 메뉴 → "슬롯 변경 / 새로 시작" 버튼으로 슬롯 화면 복귀
6. 슬롯 화면에서 슬롯별 삭제 버튼 제공

### `useSaveLoad` hook

```typescript
function useSaveLoad(slotId: 1 | 2 | 3 | null) {
  // slotId가 null이면 슬롯 선택 화면 상태
  // saveState(state): 해당 슬롯에 저장
  // loadState(): 해당 슬롯 불러오기
  // clearSlot(id): 슬롯 삭제
  // listSlots(): SaveSlot[] 전체 슬롯 미리보기
}
```

---

## 3. 버그 수정 및 타입 안전성

### 3-1. `drawQuestPool` 사이드 이펙트 제거

- **문제**: 함수 내부 `Math.random()` → 렌더 사이클에서 호출 시 매 렌더마다 다른 결과
- **수정**:
  - `questPool: string[]`을 게임 상태로 관리
  - `drawQuestPool()`은 `useEffect` 내 명시적 이벤트(날짜 진행, 수동 새로고침)에서만 호출
  - 함수 시그니처에서 순수성 유지 (외부 랜덤 소스 인자로 받는 방식 고려)

### 3-2. 타입 안전성 강화

- `types.ts`에 `RoomId = '훈련소' | '길드마스터룸' | '식당'` 추가, `Mercenary.room`에 적용
- `weaponOf()` 헬퍼에 fallback 보장 (undefined 반환 → DEFAULT_WEAPON으로 폴백)
- `BuildingId`와 room 시스템 혼재 주석 정리

### 3-3. 릴리스 파일 git 정리

- `.gitignore`에 `release/` 추가 (빌드 산출물 추적 제외)
- `git rm --cached`로 기존 추적 중인 release 파일 제거
- 삭제된 `GM-v1.1.0.html`, `guild-manager-v1.1.0.html` 함께 정리 커밋

---

## 4. 구현 원칙

- App.tsx는 상태 `useState` 선언과 최상위 레이아웃 JSX만 남김
- 게임 로직(레벨업, 퀘스트 완료 처리 등)은 `hooks/useGameLoop.ts`로 이동
- 모든 순수 계산 함수(`effPower`, `drawQuestPool` 등)는 `utils/`로 이동
- 컴포넌트는 props로만 통신, 내부 상태 최소화
