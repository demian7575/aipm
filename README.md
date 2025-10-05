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

   빠르게 최신 코드를 받고 전체 스택을 실행하려면 루트에서 다음 스크립트를 사용할 수 있습니다.

   ```bash
   npm run dev:stack
   ```

   위 스크립트는 `git pull` → `npm install` → `npm run build` 순으로 실행한 뒤 프론트엔드와 Mock API 서버를 동시에 구동합니다. Ctrl+C를 누르면 두 프로세스가 함께 종료됩니다.

   > **참고**: 프론트엔드 화면에서 “Falling back to local mock data. Start the mock API to enable live updates.” 메시지가 보인다면 Mock API가 실행되지 않은 상태입니다. 새 터미널에서 `npm run dev:server`를 먼저 실행한 뒤 프론트엔드를 새로고침하면 실시간 데이터가 로드됩니다.

3. 린트 및 테스트

   ```bash
   npm run lint
npm test
   ```

## Mock API & GitHub Webhook

- `GET /api/mindmap` – Mindmap 루트 및 계층형 사용자 스토리/인수 테스트 스냅샷 제공
- `POST /api/mindmap/nodes` – 상위 스토리에 자식 스토리와 초안 인수 테스트를 추가 (Mock)
- `PATCH /api/mindmap/reference-repository` – Reference Document 저장소 URL/설명을 업데이트
- `POST /api/github/webhook` – GitHub MR 이벤트를 받아 새로운 Mindmap 루트를 준비

### 로컬 실행과 지속성

- Mock API는 인메모리 스냅샷을 사용하므로 **로컬 PC를 끄거나 Node.js 프로세스를 종료하면 서비스가 멈추고 데이터가 초기화**됩니다.
- 장기적으로 Mindmap 데이터를 유지하려면 서버를 별도 호스트에 배포하거나 데이터베이스(예: SQLite, PostgreSQL)를 연동하도록 확장해야 합니다.
- 개발 단계에서는 Mock API를 다시 실행하면 초기 샘플 데이터가 로드되며, 프론트엔드는 서버가 내려가 있을 경우 번들된 목 데이터를 사용합니다.

## 프론트엔드 프로토타입

- 중앙 MR을 기준으로 좌우로 가지가 뻗는 **인터랙티브 Mindmap** 캔버스 (React Flow 기반, 드래그 가능)
- 사용자 스토리 초안 모달에서 INVEST 자동 검증 및 Given/When/Then 검토 지원
- 인수 테스트 실행 로그 표 시각화 및 상태 배지
- MR 헤더에서 Reference Document 저장소 URL을 지정·수정할 수 있는 구성 모달 제공

## Reference Document 저장소 설정

- 대시보드 헤더의 **Configure** 버튼을 클릭하면 레퍼런스 문서를 보관하는 GitHub 저장소(또는 다른 URL)를 지정할 수 있습니다.
- 저장 시 URL 형식 검증을 수행하며, Mock API가 실행 중인 경우 `/api/mindmap/reference-repository` 엔드포인트에 저장됩니다.
- Mock API가 실행되지 않은 상태에서는 UI에만 반영되며, 헤더에 “Reference documents” 배지가 업데이트됩니다.

## GitHub로 변경 사항 푸시하기

### Personal Access Token(PAT) 준비

GitHub는 HTTPS Git 푸시에 계정 비밀번호를 허용하지 않으므로 PAT 또는 SSH 인증이 필요합니다. **Settings → Developer settings → Personal access tokens**에서 토큰을 발급하고, 다음 권한을 포함시키세요.

- **Classic PAT**: `repo` 범위 전체
- **Fine-grained PAT**: 대상 저장소(`demian7575/aipm` 등)를 지정하고 *Repository permissions → Contents: Read and write* 활성화

생성된 토큰은 이후 `git push` 시 비밀번호 대신 입력하거나, 환경 변수에 저장해 자동화 스크립트와 함께 사용할 수 있습니다.

### push-to-github 스크립트 사용

루트 `package.json`에 `npm run push:github` 스크립트를 추가해 두었습니다. 이 스크립트는 다음을 수행합니다.

1. 작업 디렉터리에 남은 변경 사항이 없는지 확인합니다.
2. 지정된 원격이 없으면 `GITHUB_PUSH_URL` 환경 변수(또는 명령행 인자)로 전달된 URL을 사용해 원격을 추가하거나 갱신합니다.
3. 현재 체크아웃된 브랜치를 원격에 푸시하며, 업스트림이 없으면 자동으로 `--set-upstream`을 사용합니다.

사용 예시는 다음과 같습니다.

```bash
# 최초 1회: 토큰을 포함한 URL을 환경 변수로 지정 (세션 종료 시 초기화됨)
export GITHUB_PUSH_URL="https://<github-username>:<personal-access-token>@github.com/<github-username>/<repo>.git"

# 현재 브랜치를 origin으로 푸시 (기본값 origin, 현재 브랜치)
npm run push:github

# 원격/브랜치/URL을 명령 인자로 명시하고 싶을 때
bash scripts/push-to-github.sh upstream main https://github.com/acme/aipm.git
```

원격이 이미 설정되어 있다면 환경 변수를 지정하지 않아도 됩니다. 단, 토큰이 포함된 URL은 커맨드 히스토리에 남을 수 있으므로 보안에 유의하세요. SSH 키를 사용한다면 `git remote set-url origin git@github.com:<user>/<repo>.git`로 전환한 뒤 `npm run push:github`를 실행하면 됩니다.

### 수동으로 푸시하기

스크립트를 사용하지 않고 직접 푸시하려면 다음 단계를 참고하세요.

1. **원격(origin) 설정**
   ```bash
   git remote add origin https://github.com/<your-account>/<your-repo>.git
   ```
   이미 원격이 있다면 `git remote -v`로 설정을 확인할 수 있습니다.

2. **브랜치 푸시**
   ```bash
   git push -u origin work
   ```
   다른 브랜치를 사용 중이라면 `work` 대신 해당 브랜치 이름을 넣어 주세요. 최초 푸시 이후에는 `git push`만 실행하면 됩니다.

3. **Pull Request 생성(선택)**
   협업 중이라면 GitHub에서 Pull Request를 열어 코드 리뷰와 CI 결과를 공유하세요.

4. **최신 코드 동기화**
   다른 환경에서 작업을 시작할 때는 `git clone`으로 저장소를 내려받거나, 기존 복사본에서는 `git pull`로 최신 커밋을 가져옵니다.

## CI 파이프라인

`.github/workflows/ci.yml`은 GitHub Actions에서 Node.js 환경을 설정하고 린트/테스트/빌드를 실행합니다. 워크플로는 모든 Pull Request와 `main` 브랜치 푸시에 대해 자동으로 실행됩니다.

## 라이선스

추후 정의 예정입니다.
