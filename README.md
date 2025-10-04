# AI Project Manager Mindmap

AI Project Manager Mindmap(AIPM)은 Merge Request(MR)를 기반으로 한 계층적 사용자 스토리 및 인수 테스트 관리 도구입니다. 이 저장소는 웹 기반 Mindmap UI와 이를 지원하는 백엔드 서비스를 통해 다음을 목표로 합니다.

- MR를 루트로 하는 계층적 사용자 스토리 시각화
- 각 스토리에 대한 Given/When/Then 형식의 인수 테스트 관리
- 하위 테스트의 통과 여부에 따른 상위 스토리/ MR 자동 완료 처리

## 모노레포 구조

```
/ (root)
├── client/   # 웹 프론트엔드 (React + TypeScript + Vite)
├── server/   # 백엔드 서비스 (Mock API + GitHub Webhook 처리)
└── docs/     # 요구사항, 설계 문서 등 (추가 예정)
```

## 개발 시작하기

> **사전 준비**: Node.js 18 이상을 권장합니다.

1. 의존성 설치

   ```bash
   npm install
   ```

   위 명령은 루트의 `package.json`에 정의된 npm 워크스페이스를 이용해 `client/`와 `server/` 하위 프로젝트의 의존성을 한 번에 설치
   합니다. 설치가 원활하게 진행되지 않는다면 다음 체크리스트를 순서대로 따라 주세요.

   1. **Node.js 버전 확인** – `node -v`로 18 이상인지 확인합니다. 버전이 낮다면 최신 LTS로 업데이트하세요.
   2. **npm 캐시 정리(선택)** – 반복 실패 시 `npm cache clean --force` 명령으로 캐시를 비운 뒤 다시 설치합니다.
   3. **프록시/방화벽 확인** – 사내 네트워크에서 npm 레지스트리에 접근이 막혀 있다면 `.npmrc`에 프록시를 설정하거나 오프라인
      미러를 사용해야 합니다.
   4. **개별 워크스페이스 재설치** – 특정 패키지만 실패할 경우 `npm install --workspace client`, `npm install --workspace server`와 같이
      개별로 설치를 시도할 수 있습니다.
   5. **문제 해결 로그 확인** – `npm install --verbose` 옵션을 사용해 실패 지점을 파악한 후 필요한 패키지 버전이나 네트워크 설정을
      조정합니다.

   설치가 완료되면 루트에 `package-lock.json`과 각 워크스페이스의 `node_modules/` 디렉터리가 생성됩니다.

2. 개발 서버 실행

   ```bash
   # 프론트엔드 (Vite)
   npm run dev --workspace client

   # Mock API 서버 (Express)
   npm run dev:server
   ```

3. 린트 및 테스트

   ```bash
   npm run lint
npm test
   ```

## Mock API & GitHub Webhook

- `GET /api/mindmap` – Mindmap 루트 및 계층형 사용자 스토리/인수 테스트 스냅샷 제공
- `POST /api/mindmap/nodes` – 상위 스토리에 자식 스토리와 초안 인수 테스트를 추가 (Mock)
- `POST /api/github/webhook` – GitHub MR 이벤트를 받아 새로운 Mindmap 루트를 준비

> Mock API는 인메모리 스냅샷을 사용하므로 서버 재시작 시 초기 상태로 되돌아갑니다.

## 프론트엔드 프로토타입

- 정적 Mindmap 데이터를 기반으로 한 3패널 레이아웃(트리, 상세 패널, 테스트 로그)
- 사용자 스토리 초안 모달에서 INVEST 자동 검증 및 Given/When/Then 검토 지원
- 인수 테스트 실행 로그 표 시각화 및 상태 배지

## CI 파이프라인

`.github/workflows/ci.yml`은 GitHub Actions에서 Node.js 환경을 설정하고 린트/테스트/빌드를 실행합니다. 워크플로는 모든 Pull Request와 `main` 브랜치 푸시에 대해 자동으로 실행됩니다.

## 라이선스

추후 정의 예정입니다.
