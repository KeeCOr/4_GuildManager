# GuildManager 업데이트 내역서

## 2026-06-24 문서 구조 정리
- 기획서와 업데이트 내역서를 분리했다.
- 기획서는 게임 소개, 핵심 루프, MVP 가설, KPI, UX 원칙 중심으로 재작성했다.
- 변경 이력, 구현 로그, 검증 기록은 이 문서에서 관리한다.

## 기존 문서에서 분리한 이력 후보
- v1.1.43 신규
- Game Design Document · v1.1.43 · 2026-04-29
- 파견 중에도 다른 퀘스트 동시 수행 가능. 타이머 완료 후 성공/실패 판정.
- 선행 퀘스트를 완료해야 다음 체인 퀘스트가 풀에 출현한다. 체인 마지막 완료 시 스토리 모달 연출.
- 완료 시 스토리: 수상한 화물 발견
- 완료 시 체인 종료 스토리
- 완료 시 스토리: 봉인된 유물 발견
- 완료 시 스토리: 요새의 비밀
- 완료 시 스토리: 어둠의 낌새
- 완료 시 스토리: 어둠의 사원
- 퀘스트 완료gold × duration—등급별 일당 × 소요일수
- &#11088; &#47749;&#49457; &#44060;&#54200; (v1.1.43)
- &#128147; &#54984;&#47828;&#49548; &#49464;&#48516;&#54868; (v1.1.43)
- &#128161; &#51059;&#51116;&#47141; &#49884;&#49828;&#53596; (v1.1.43)
- &#128142; &#47560;&#49437; &#51088;&#50896; (v1.1.43)
- &#129504; FM &#49457;&#44201; &#49884;&#49828;&#53596; (v1.1.43)
- &#127991; &#51204;&#47928;&#49457; &#53468;&#44536; (v1.1.43)
- &#129309; &#51032;&#47113;&#51064; NPC (v1.1.43)

## 작성 규칙
- 기능 추가, 밸런스 변경, UI/UX 수정, 리소스 교체, 빌드/배포 변경은 날짜와 버전을 함께 기록한다.
- 기획서에는 최신 소개와 현재 설계 의도만 남기고, 과거 작업 로그는 이 문서로 이동한다.
- MD와 HTML은 항상 함께 갱신한다.

## 2026-06-29 v1.2.0 Quest Risk Advisory

- Added `src/utils/questAdvisory.ts` to generate quest risk summaries and deterministic mercenary recommendations.
- Quest cards now show total death-risk estimate, highest-risk mercenary, expected condition drain, top two risk factors, and hard warnings for low power or high-risk members.
- The recommend-party action now uses the same candidate scoring as the visible recommendation panel and logs the top recommended names.
- Added a regression test that locks the advisory utility exports and App integration points.
- Verification target: `npm test`, `npm run build`, Electron portable `GuildManager_v1.2.0_portable.exe`.
## 2026-06-29 v1.1.95 Dungeon Entrance Visual Runtime Link

- `src/components/DungeonPanel.tsx` now imports `src/assets/Generated/dungeon-entrance.png` and renders it as the top visual banner of the dungeon modal.
- The image uses the existing dungeon entrance resource already listed in the image resource table, so the runtime now matches the documented resource set.
- Added a regression test that checks the dungeon panel keeps importing and rendering the dungeon entrance visual.
- Verification target: `npm test`, `npm run build`, Electron portable `GuildManager_v1.1.95_portable.exe`.



---

## 2026-06-30 v1.2.0 Advisory Verification

- Quest risk, candidate recommendation, equipment recommendation hints, and management priority strip were verified as the current v1.2.0 improvement batch.
- Validation: `npm test` passed 7 tests; `npm run build` passed; Electron portable packaging produced `GuildManager_v1.2.0_portable.exe`.
- Next recommended QA: visual stress check for 100+ mercenaries and 3x Korean text in dashboard and equipment modal.

## 2026-06-30 v1.3.1

- 첫 파견 90초 흐름을 개선하는 `추천 행동` 배너를 추가했다.
- 첫 계약 전 자동 힌트 카드가 계약/파견 CTA를 막지 않도록 억제 조건을 추가했다.
- 업그레이드 재료 표기를 목재/석재/문장 중심으로 한국어화했다.
- 온보딩 추천 유틸과 4개 동작 회귀 테스트를 추가했다.
## 2026-06-30 v1.4.1

- 전술 리플레이에 `판단 근거` 스트립을 추가했다.
- 전력 우위/경고, 함정 대응 여부, 보상 지점을 한국어 인사이트 카드로 표시한다.
- 리플레이 이벤트 문구와 적/함정 이름을 한국어화했다.
- 전술 리플레이 인사이트 회귀 테스트를 추가했다.
## 2026-07-01 v1.4.1 Visual QA Recovery
- 장비 모달의 긴 장비명/추천 힌트/대량 인벤토리 상황에서 버튼이 줄바꿈되고 슬롯별 목록이 독립 스크롤되도록 레이아웃 방어를 추가했다.
- 신규 방 시설/업그레이드 자원 타입은 이전 저장 데이터와 호환되도록 optional 필드로 정리했다.
- 검증: `npm test` 9개 통과, `npm run build` 통과, Electron portable 재생성 및 루트/release/Drive 복사 완료.