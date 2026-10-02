# 4_GM 프로젝트 규칙

## 프로젝트 성격

- 이 프로젝트는 Guild/Medieval Mercenary Manager 게임이다.
- 실제 활성 구현은 React 18 + TypeScript + Vite이다. 데스크톱 패키지는 Electron, 배포본은 단일 HTML을 사용한다.
- `ProjectSettings`와 `Temp`는 과거 Unity 흔적이다. 사용자는 현재 Unity를 쓰지 않으므로 Unity 설치·실행·복원을 시도하지 않는다.
- 주요 소스는 `src`, 테스트는 `tests`, 기획과 변경 기록은 `docs`에 있다.
- `dist`, `release`, `node_modules`, `electron/node_modules`, `Temp`는 생성물 또는 캐시로 취급하며 기능 분석의 기준으로 삼지 않는다.

## 작업 순서

- 기능을 바꾸기 전에 `docs/GuildManager_기획서.md`, `docs/next_improvement_instruction.md`, 관련 소스와 테스트를 확인한다.
- 게임 규칙은 가능하면 `src/utils`의 순수 함수로 분리하고 `tests`에 회귀 테스트를 추가한다.
- UI 변경 시 좁은 화면, 빈 상태, 긴 텍스트, 저장 데이터가 있는 상태를 함께 확인한다.
- 저장 형식을 바꿀 때 기존 세이브 호환성을 유지하거나 명시적인 마이그레이션을 제공한다.
- 새 패키지는 기존 React/Vite 구성으로 해결하기 어려울 때만 추가한다.

## 검증과 릴리스

- 개발 중 기본 검증은 `npm test`와 `npm run build`이다.
- `node scripts/build-release.js`는 patch 버전을 자동 증가시키고 `release/GM-v{version}.html`을 만든다.
- 단순 조사나 중간 수정마다 릴리스 버전을 올리지 않는다. 사용자가 완성본 또는 배포본을 요청했거나 변경이 검증되어 전달 가능한 상태일 때만 릴리스 스크립트를 실행한다.
- 릴리스 전 기획서와 `docs/GuildManager_업데이트_내역서.md`를 실제 변경 내용에 맞게 갱신한다.

## GDD 상시 최신화 규칙

- 기능, 게임 규칙, 밸런스 수치, 경제, 전투 공식, 콘텐츠, UI 흐름, 저장 형식 또는 구현 상태가 바뀌면 같은 작업 안에서 GDD를 함께 갱신한다. GDD 갱신 전에는 해당 작업을 완료로 보고하지 않는다.
- 정본은 `docs/GuildManager_GDD.md`이며, 대응 문서인 `docs/GuildManager_GDD.html`도 같은 내용과 표 구조로 동시에 갱신한다.
- 세부 규칙이 바뀌면 `docs/GuildManager_기획서.md`와 HTML 대응본, 실제 구현 변경이면 `docs/GuildManager_업데이트_내역서.md`와 HTML 대응본도 함께 갱신한다.
- GDD에는 의도만 쓰지 않고 현재 구현된 조건, 임계값, 확률, 배율, 예외, 저장 호환 방식과 플레이어에게 노출되는 화면을 기록한다. 미구현 제안은 반드시 `제안` 또는 `미구현`으로 구분한다.
- 문서를 갱신할 때 오래된 `추정`, `미확인`, `미열람`, 테스트 개수, 버전, 구현 상태 문구를 검색하여 현재 코드 및 테스트 결과와 맞지 않는 항목을 정리한다.
- 직업·종족·속성·몬스터·난이도처럼 대응 관계가 셋 이상인 규칙은 가능한 한 표로 관리하고, 코드 수치가 바뀌면 표의 수치도 같은 작업에서 바꾼다.
- `npm test` 또는 `npm run build`의 구성과 결과가 달라지면 GDD의 검증 근거와 구현 상태 매트릭스를 갱신한다.
- 릴리스 여부와 관계없이 누적 변경이 발생한 작업 종료 시 GDD 동기화 여부를 최종 점검한다.
