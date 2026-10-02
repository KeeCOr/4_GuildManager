# GuildManager 업데이트 내역서

## 2026-09-15 퀘스트 실패 평판 손실
- 퀘스트를 클리어하지 못하면 사망 여부와 별개로 길드 평판이 감소한다.
- 실패 평판 손실은 난이도 50/100/150/200/250/300/350/400/450/500/600을 경계로 1~12까지 세분화되며, 사망자가 발생하면 기존 사망 평판 손실이 추가로 적용된다.
- 일반 완료와 일괄 완료가 같은 계산식을 사용한다.
- 성공한 퀘스트도 전 파티원에게 사망 판정을 적용하지만, 전멸 판정이 나오면 사망 위험이 가장 낮은 한 명은 반드시 생존한다.

## 2026-09-16 성과별 특별보수
- 퀘스트 종료 후 성과와 희생 규모에 따라 특별보수 또는 격려금 지급 여부를 선택한다.
- 지급하면 생존 참여자의 충성·사기·컨디션이 회복되며, 미지급하면 기대 수준에 따라 세 수치가 하락한다.
- 여러 퀘스트가 동시에 완료되면 특별보수 결정을 순서대로 처리한다.

## 2026-09-16 전리품·직업 특성 정비
- 성과 판정을 강적 조우, 부산물 대량 회수, 특별 퀘스트 아이템 확보의 세 기준으로 변경했다.
- 부산물 창고와 고유 퀘스트 아이템 보관·저장 시스템, 언제든 지급 가능한 용병 개인 특별보수를 추가했다.
- 다섯 직업의 역할·설명·능력치 가중치·사망 위험 보정을 공통 특성표로 통합하고 용병 상세 화면에 표시한다.
- 몬스터 숫자·크기·속성·언데드·비행 편성을 추가하고 계약 화면과 결과 기록에 표시한다.
- 소수전/다수전/비행/대형/언데드 상성과 몬스터 규모별 부산물 수량을 직업·종족·속성 효과에 연결했다.

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

## 2026-09-21 v1.4.1 출정 준비 비교

- 목표 예시 화면 `docs/design-references/2026-09-21-quest-readiness-comparison.png`을 먼저 제작했다.
- 계약 카드에 전력·함정 대응·핵심 역할·속성 대응의 요구/현재/충족 상태와 우선 행동 힌트를 추가했다.
- 공용 계산을 `src/utils/questReadiness.ts`로 분리하고 `tests/questReadiness.test.mjs` 회귀 검사를 추가했다.
- 컴포넌트 분해: 기존 계약 카드 레이아웃, 비교 헤더, 4개 상태 행, 행동 힌트. 로컬 동기 계산이므로 별도 로딩·오류 상태는 없다.
- 검증: `npm test` 26개 통과, `npm run build` 통과. 대형 번들 경고는 잔존하며 실제 실행 화면 수동 시각 QA는 미검증이다.

## 2026-09-23 v1.4.1 의뢰 결과 구분

- 평면 로그였던 결과 화면을 보상 및 성장, 부상, 전사, 부산물, 특별 아이템, 후속 영향, 임무 기록 섹션으로 분리했다.
- 실패 후 생존 용병에게 적용되는 부상을 대상 이름·HP 감소·파견 제한과 함께 두 완료 경로 모두에 기록했다.
- 결과가 없을 때 의뢰 파견이 다음 행동임을 알려주는 빈 상태 문구를 추가하고, 섹션 제목과 항목 수를 보조기기에 연결했다.
- 변경 파일: `src/App.tsx`, `src/utils/questResultSections.ts`, `tests/questResultSections.test.mjs`, `package.json`.
- 검증: `npm test` 30개 통과, `npm run build` 통과, Impeccable 기계 검사 지적 0건. 대형 번들 경고는 잔존하며 수동 시각 QA·Electron 패키징은 미검증이다.
