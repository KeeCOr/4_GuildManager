# GuildManager 기획서

문제 정의: 방치형 성장만으로는 부족한 플레이어가 파티 조합, 장비, 퀘스트 위험도를 직접 조율하고 싶어 한다.

## 게임 소개
용병을 고용하고 퀘스트와 장비, 길드 경제를 운영하는 중세 길드 매니지먼트.

GuildManager의 핵심 매력은 한 번의 선택이 다음 장면의 위험도, 보상, 성장 방향으로 이어지는 구조다. 이 문서는 처음 보는 사람에게 게임의 재미와 현재 방향을 빠르게 소개하기 위한 단일 기획서이며, 세부 변경 이력은 별도 업데이트 내역서에서 관리한다.

## 한 줄 소개
용병을 고용하고 퀘스트와 장비, 길드 경제를 운영하는 중세 길드 매니지먼트.

## 핵심 루프
유저가 현재 전장의 정보를 읽고 선택을 하면 전투/운영 결과가 갱신되고, 그 보상과 손실 때문에 다시 다음 선택을 준비한다.

## 게임 플레이 예시
- 1단계: 플레이어가 GuildManager의 현재 목표, 보유 자원, 즉시 대응해야 할 위험을 확인한다.
- 2단계: 카드, 유닛, 배치, 명령, 이동 중 현재 상황에 맞는 핵심 행동을 선택한다.
- 3단계: 선택 결과가 전투, 운영, 보상, 손실로 즉시 갱신되고 다음 판단의 근거가 된다.
- 4단계: 획득한 보상이나 변화한 상태를 바탕으로 다음 선택을 준비하며 핵심 루프를 반복한다.
- 플레이 감각: 짧은 세션 안에서 상황 파악, 의미 있는 선택, 즉각적인 피드백, 다음 목표 제시가 끊기지 않는 흐름을 지향한다.

## 핵심 재미
- 읽기 쉬운 상황 판단: 지금 위험한 요소와 얻을 수 있는 보상이 한눈에 들어온다.
- 직접적인 선택 피드백: 선택 직후 전투, 점수, 자원, 성장 상태가 변해 손맛을 만든다.
- 누적되는 성장감: 반복 플레이가 단순 재시작이 아니라 다음 전략의 재료로 이어진다.

## 주요 시스템
- 핵심 선택 시스템: 현재 국면에서 가능한 행동을 5개 이하의 명확한 선택지로 제시한다.
- 위험/보상 피드백: 행동 전후의 이득, 손실, 위협 변화를 빠르게 보여준다.
- 성장과 해금: 세션 결과가 능력, 카드, 유닛, 건물, 장비, 스테이지 등 다음 플레이의 선택지를 넓힌다.
- 상태별 UX: 로딩, 빈 상태, 오류, 많은 데이터, 긴 텍스트 상황에서도 레이아웃이 무너지지 않도록 관리한다.
- 실행 안정성: 테스트와 빌드 산출물을 기준으로 현재 플레이 가능한 범위를 계속 확인한다.

## 게임 구성과 규칙 (GDD 통합)
- 통합 기준 문서: `superpowers/specs/2026-04-21-refactor-design.md`, `superpowers/specs/2026-05-06-equipment-merchant-dungeon-design.md`, `superpowers/specs/2026-06-17-living-room-mercenaries-design.md`
- 작성 기준: 16_PokerStrike_GDD처럼 화면 구조, 핵심 시스템, 진행/승패 규칙, UI/HUD, 미결 항목을 한 문서에서 바로 읽을 수 있게 정리한다.

### 화면/플레이 구조
- **1. 파일 구조 (기능별 폴더)** (superpowers/specs/2026-04-21-refactor-design.md)
  - MercCard.tsx # 용병 카드 UI
  - QuestCard.tsx # 퀘스트 카드 UI
  - BuildingPanel.tsx # 건물 관리 패널
  - StatRadar.tsx # (기존 유지)
  - CondBar.tsx # 컨디션 바
  - SaveSlotScreen.tsx # 슬롯 선택 화면
  - useGameLoop.ts # 실시간 타이머 (퀘스트 완료 체크)
- **데이터 구조** (superpowers/specs/2026-04-21-refactor-design.md)
  - 코드 예시는 원본 설계 문서를 참조한다.
  - interface SaveSlot {
  - slotId: 1 | 2 | 3
  - savedAt: number // Unix timestamp ms
  - day: number // 현재 날짜 (슬롯 미리보기용)
  - fame: number // 명성 (슬롯 미리보기용)
  - mercCount: number // 용병 수 (슬롯 미리보기용)
- **동작 흐름** (superpowers/specs/2026-04-21-refactor-design.md)
  1. 앱 실행 → `SaveSlotScreen` 표시
  2. 빈 슬롯 클릭 → 새 게임 시작
  3. 저장된 슬롯 클릭 → 해당 상태 불러와 게임 진입
  4. 게임 중 상태 변경 시 → 디바운스 1초 후 해당 슬롯 자동저장
  5. 게임 내 메뉴 → "슬롯 변경 / 새로 시작" 버튼으로 슬롯 화면 복귀
  6. 슬롯 화면에서 슬롯별 삭제 버튼 제공

### 핵심 시스템
- **목표** (superpowers/specs/2026-04-21-refactor-design.md)
  - App.tsx God Component 해소, localStorage 저장 슬롯 시스템 추가, 버그 수정 및 타입 안전성 강화, 빌드 산출물 git 정리.
- **3-2. 타입 안전성 강화** (superpowers/specs/2026-04-21-refactor-design.md)
  - `types.ts`에 `RoomId = '훈련소' | '길드마스터룸' | '식당'` 추가, `Mercenary.room`에 적용
  - `weaponOf()` 헬퍼에 fallback 보장 (undefined 반환 → DEFAULT_WEAPON으로 폴백)
  - `BuildingId`와 room 시스템 혼재 주석 정리
- **Type Definitions** (superpowers/specs/2026-05-06-equipment-merchant-dungeon-design.md)
  - type EquipSlot = 'weapon' | 'head' | 'body' | 'accessory'
  - type EquipGrade = 'D' | 'C' | 'B' | 'A' | 'S'
  - interface PassiveEffect {
| 'quest_success_morale'     // 퀘스트 성공 시 사기 +N
| 'same_element_death_resist'// 속성 일치 퀘스트에서 사망률 -N%
| 'trap_bonus'               // 함정 퀘스트 성공률 +N%
| 'survival_bonus'           // 생존율 +N (추가)
| 'morale_recovery_on_kill'  // 퀘스트 성공 시 사기 회복 +N
| 'guild_fame_bonus'         // 퀘스트 성공 명성 +N
  - value: number
- **Item Pool — `src/data/equipment.ts`** (superpowers/specs/2026-05-06-equipment-merchant-dungeon-design.md)
  - 슬롯별 5종 × 5등급 = 100종. 세트는 4종 정의.
| 세트명 | 친화 직업 | 2세트 효과 | 3세트 효과 |
|---|---|---|---|
| 그림자 세트 | 도적 | 함정해제 +8 | 암흑 퀘 성공률 +12% |
| 철벽 세트 | 전사 | 생존율 +10 | 사망 위험 -20% |
| 현자 세트 | 마법사 | 전력 +15 | 속성 일치 시 추가 명성 +3 |
| 자연 세트 | 궁수/성직자 | 사기 +10 | 퀘스트 성공 사기 회복 +5 |

### 진행/승패 규칙
- **MerchantPanel.tsx** (superpowers/specs/2026-05-06-equipment-merchant-dungeon-design.md)
  - ┌──────────────────────────────────────┐
  - │ 🛒 행상인 [출발까지: 7분 23초] │
  - ├──────────────────────────────────────┤
  - │ [그림자 단검 A] │
  - │ 공격 +12 / 함정 +8 │
  - │ 패시브: 암흑 퀘 성공률 +10% │
  - │ 420G [구매] │

### UI/HUD/피드백
- **3-3. 릴리스 파일 git 정리** (superpowers/specs/2026-04-21-refactor-design.md)
  - `.gitignore`에 `release/` 추가 (빌드 산출물 추적 제외)
  - `git rm --cached`로 기존 추적 중인 release 파일 제거
  - 삭제된 `GM-v1.1.0.html`, `guild-manager-v1.1.0.html` 함께 정리 커밋
- **Equipment, Merchant, Dungeon System Design** (superpowers/specs/2026-05-06-equipment-merchant-dungeon-design.md)
  - **Date:** 2026-05-06
  - **Project:** 4_GM — 아이언홀드 용병단 길드
  - **Status:** Approved
- **New Files** (superpowers/specs/2026-05-06-equipment-merchant-dungeon-design.md)
  - equipment.ts # Item pool (~100 items), set definitions
  - dungeons.ts # Dungeon name pool, floor scaling
  - EquipmentModal.tsx # Per-merc equipment management UI
  - MerchantPanel.tsx # Visiting merchant modal
  - DungeonPanel.tsx # Dungeon progress + dispatch UI
  - useMerchant.ts # Merchant arrival/departure timing
  - useDungeon.ts # Dungeon state management

### 구현 메모/미결
- **Dungeon Trigger** (superpowers/specs/2026-05-06-equipment-merchant-dungeon-design.md)
  - 퀘스트 완료 후 드롭 체크와 별도로 던전 발생 판정:
| 퀘스트 티어 | 확률 | 입장 가능 층 |
|---|---|---|
| Lv1 | 3% | 1~3층 |
| Lv2 | 5% | 2~5층 |
| Lv3 | 8% | 4~7층 |
| Lv4 | 12% | 6~10층 |
- **useDungeon.ts** (superpowers/specs/2026-05-06-equipment-merchant-dungeon-design.md)
  - 던전 상태 관리, 층 완료 판정 (processCompletions에서 훅 호출).
  - SaveSlotData에 `activeDungeon: ActiveDungeon | null` 포함.

## MVP 가설
| 기능 | 검증할 가설 | 검증 방법 |
|------|-------------|-----------|
| 핵심 전투/운영 루프 | 플레이어는 한 판 안에서 선택 결과를 이해하면 다음 판을 자발적으로 시작한다. | 1회 플레이 후 재시작률 60% 이상 |
| 위험/보상 표시 | 위험과 보상이 동시에 보이면 선택 시간이 줄고 납득도가 오른다. | 주요 선택 평균 8초 이내, 결과 불만 피드백 20% 이하 |
| 성장 보상 | 보상이 다음 전략을 바꾸면 반복 플레이 피로가 낮아진다. | 3판 내 서로 다른 빌드 선택률 50% 이상 |

## 레퍼런스 분석
- 장르 기준 레퍼런스는 한 판 시작까지 3단계 이내, 첫 의미 있는 선택까지 30초 이내가 목표다.
- 적용 교훈: 규칙 설명보다 먼저 선택 가능한 상황을 보여주고, 결과 화면에서 다음 판의 개선 포인트를 바로 제안한다.

## 현재 개발 상태 예상 수치
- 완성 목표 대비 구현 체감도: 약 82%
- 첫 세션에서 핵심 루프가 전달될 가능성: 약 88%
- UI/리소스 일관성 체감: 약 78%
- 콘텐츠와 반복 플레이 분량 충족도: 약 78%
- 빌드/실행 안정성 기대치: 약 90%
- 해석 기준: 현재 문서, 최근 산출물 기록, 연결된 예시 이미지 유무를 기준으로 한 사전 추정치이며 실제 플레이 테스트 후 ±15%p 정도 보정이 필요하다.

- 첫 세션 평균 플레이 시간 8분 이상
- 첫 세션 내 2회차 진입률 55% 이상
- 핵심 선택 화면에서 무응답/이탈률 15% 이하

## 현재 구현 상태
- 이 문서는 2026-06-24 기준으로 현재 플레이 방향과 구현 체감 상태를 요약한다.
- 핵심 루프, 조작 원칙, 리소스 적용 현황, 빌드 기준은 프로젝트별 실제 구현과 산출물 기록을 기준으로 계속 보정한다.
- 세부 변경 이력은 별도 업데이트 내역서에서 관리하고, 본 기획서는 처음 보는 사람이 현재 방향을 빠르게 이해하는 공유 문서로 유지한다.
- 새 기능, 밸런스 변경, 리소스 교체, UX 개선이 들어가면 본문과 HTML 문서를 함께 갱신한다.

## 조작과 UX 원칙
- 주요 버튼은 44px 이상으로 유지하고, 화면당 CTA 강조색은 하나만 사용한다.
- 버튼/선택지는 한 번에 5개 이하로 노출해 판단 부담을 줄인다.
- 로딩, 빈 상태, 에러, 많은 데이터, 긴 텍스트 상태를 각각 별도 화면/컴포넌트로 확인한다.
- HUD 동일 레이어 요소는 겹치지 않게 배치하고, 겹침이 필요한 효과는 별도 depth/z-order를 쓴다.

## 적용 리소스
- 런타임에 쓰이는 대표 이미지와 UI 리소스는 프로젝트별 asset/public/Resources 경로를 기준으로 관리한다.
- 새 이미지가 필요할 때는 프로젝트 접두어를 포함한 lowercase kebab-case 파일명을 사용한다.
- 최종 런타임 비주얼은 PNG/WebP 등 비트맵 자산을 우선 사용하고, SVG 또는 코드 드로잉은 문서/임시 참조로만 남긴다.

## 공유용 이미지 미리보기
![GuildManager 공유용 예시 1](archive/GuildManager_gameplay_preview_v1.png)

![GuildManager 공유용 예시 2](GuildManager_01_플레이예시.png)

![GuildManager 공유용 예시 3](GuildManager_레퍼런스_플레이예시_구버전.png)

- docs/GuildManager_01_플레이예시.png
- docs/GuildManager_레퍼런스_플레이예시_구버전.png
- src/assets/BG/BG_Base.jpg

## 빌드, 테스트, 릴리스
- npm test
- npm run build
- 현재 문서 기준 버전: 1.1.94

## 남은 리스크와 다음 우선순위
- 첫 화면에서 게임의 목표와 다음 행동이 5초 안에 보이는지 확인한다.
- 주요 선택의 결과 예측과 실제 결과가 어긋나는 지점을 플레이 테스트로 수집한다.
- 기획서에 남아 있던 변경 이력성 내용은 업데이트 내역서로 계속 이동해 소개 문서의 밀도를 유지한다.
