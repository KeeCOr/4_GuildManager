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