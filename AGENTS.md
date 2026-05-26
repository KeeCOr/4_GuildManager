# 4_GM 프로젝트 규칙

## 빌드 규칙

사용자의 지시가 완료될 때마다 반드시 릴리스 빌드를 수행한다.

```bash
node scripts/build-release.js
```

이 스크립트가 하는 일:
1. `package.json` patch 버전 자동 증가 (예: 1.1.0 → 1.1.1)
2. TypeScript 컴파일 + Vite 빌드
3. `release/GM-v{version}.html` 단일 파일 패키징
