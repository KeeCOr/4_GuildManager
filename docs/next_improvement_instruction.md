# GuildManager Next Improvement Instruction

Scope: `C:\Development\4_GM` only. Do not touch other projects. Do not revert unrelated dirty docs or worktree edits. This is an implementation-ready UX/system batch; build only when the full batch is complete and the user asks for a build.

## 1. Quest Risk Decision Preview

Improve the quest dispatch flow so players can understand why a party is safe or dangerous before launch.

- Add a quest risk summary to each selected quest: success rate, total death-risk band, highest-risk mercenary, expected condition drain, and the top 2 factors affecting the result.
- Make the risk explanation actionable: identify missing role, low effective power, weak element match, trap exposure, low survival, or poor condition/morale.
- Add a hard-to-miss warning state for parties below recommended power or with any mercenary above a high death-risk threshold.
- Acceptance: changing assigned mercenaries updates the risk copy immediately, and the same calculation source is reused by dispatch confirmation and quest card UI.

## 2. Mercenary And Equipment Recommendation

Add recommendation support that helps players choose the best available mercenary and equipment for a specific quest without auto-playing the game.

- On a quest, show the top 3 available mercenary candidates with reasons such as class fit, element advantage, trap ability, survival, morale, and equipment synergy.
- In the equipment modal or mercenary detail, show "recommended for current quest" item hints for the selected mercenary and explain the stat/passive tradeoff.
- Keep recommendations inspectable rather than mandatory: the player can ignore them, and manual assignment/equipment choices remain unchanged.
- Acceptance: recommendations are deterministic for the same state, handle empty inventory/roster gracefully, and avoid recommending busy or dead mercenaries.

## 3. Management Dashboard Clarity

Refine the management dashboard so the current guild situation is readable in one scan before the player opens detailed panels.

- Add a compact priority strip for immediate concerns: food runway, gold runway, idle mercenaries, wounded/low-condition mercenaries, active quests, and pending rewards.
- Group existing resource and guild stats by decision purpose: economy, roster health, quest pipeline, and progression.
- Add empty and overflow states for large rosters or no active quests so the layout stays stable at 100+ mercenaries and with 3x longer text.
- Acceptance: the dashboard identifies the next best management concern without requiring log reading, and no HUD/dashboard elements overlap at desktop widths.

## 2026-06-30 Completion Note
- Completed as v1.2.0: quest cards now expose shared risk summaries, warnings, top factors, candidate recommendations, equipment hints, and a compact management priority strip.
- Validation rerun in this batch: `npm test` passed 7 tests and `npm run build` passed.
- Next recommended batch: visual QA pass for the large dashboard and equipment modal at 100+ mercenaries and 3x Korean text.
## 2026-07-01 v1.4.1 Visual QA Recovery
- 장비 모달의 긴 장비명/추천 힌트/대량 인벤토리 상황에서 버튼이 줄바꿈되고 슬롯별 목록이 독립 스크롤되도록 레이아웃 방어를 추가했다.
- 신규 방 시설/업그레이드 자원 타입은 이전 저장 데이터와 호환되도록 optional 필드로 정리했다.
- 검증: `npm test` 9개 통과, `npm run build` 통과, Electron portable 재생성 및 루트/release/Drive 복사 완료.

## 2026-09-18 전체 프로젝트 공통 완료 조건

1. **첫 5분 핵심 루프**: 시작 10초 안에 목표가 읽히고, 5분 안에 첫 판단→실행→결과→보상/손실→다음 목표가 한 번 완결되어야 한다.
2. **판단 전후 피드백**: 선택 전 예상 이득·위험·비용, 실행 직후 성공·실패·상태 변화, 결과 화면의 원인·변화·다음 점검 행동을 같은 흐름으로 제공한다. 정답을 자동 추천하지 않는다.
3. **출시 증거 패키지**: 테스트·빌드·첫 5분 수동 확인·대표 실행 화면·로딩/빈 상태/오류/저장 복귀·버전과 검증 날짜를 기록한다. 수행하지 않은 항목은 미검증으로 표시한다.

공통 기준 원문: `C:\Development\_workspace_docs\전체_프로젝트_공통_개선기준_2026-09-18.md`

## 2026-09-18 프로젝트별 고유 개선 3개
> 아래 세 항목은 이 프로젝트의 고유 우선순위다. 구현 후에만 완료로 표시한다.

1. 퀘스트 요구 조건과 용병 조합의 대응 관계를 출발 전에 비교
2. 성공·부상·사망·부산물·퀘스트 아이템을 결과 화면에서 분리
3. 특별 보수·부활 요구·평판·충성·컨디션의 후속 비용 연결

## 2026-09-21 진행 상태

- [완료] 퀘스트 요구 조건과 용병 조합의 대응 관계를 출발 전에 비교: 전력·함정·핵심 역할·속성 4축, 충족 수, 우선 행동 힌트를 계약 카드에 구현했다.
- [검증 완료] `npm test` 26개, `npm run build` 통과.
- [미검증] 실제 실행 화면에서 데스크톱/좁은 폭/3배 긴 한국어의 시각적 겹침 확인.
- 다음 구현 후보: 성공·부상·사망·부산물·퀘스트 아이템을 결과 화면에서 명확히 분리한다.

## 2026-09-23 진행 상태

- [완료] 성공·부상·사망·부산물·퀘스트 아이템을 결과 화면에서 명확히 분리: 보상/성장부터 후속 영향까지 7개 고정 판단 순서로 구현했다.
- [완료] 실패 생존자의 부상 기록: 즉시 완료와 타이머 완료 양쪽에서 이름·HP -30·회복 전 파견 제한을 표시한다.
- [검증 완료] `npm test` 30개, `npm run build`, Impeccable 기계 검사 통과.
- [미검증] 실제 실행 화면 수동 시각 QA와 Electron 패키징.
- 다음 구현 후보: 특별 보수·부활 요구·평판·충성·컨디션의 후속 비용을 한 화면에서 연결한다.
