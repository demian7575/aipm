# Command Execution User Stories

이 문서는 현재 AI Project Manager Mindmap 애플리케이션을 구축하면서 실행했던 주요 커맨드들을 사용자 스토리 형태로 기록합니다. 각 스토리는 동일한 결과물을 재현하기 위해 필요한 명령과 수용 조건을 명시합니다. 아래 항목을 순서대로 수행하면 현재 저장소 상태를 재구성할 수 있습니다.

## US-01: 의존성 설치
- **As a** 팀 개발자
- **I want** 프로젝트의 모든 Node.js 의존성을 설치하고 환경을 준비하고 싶다
- **So that** 애플리케이션을 빌드하고 실행할 수 있다
- **Command**
  ```bash
  npm install
  ```
- **Acceptance Criteria**
  - 설치 과정이 오류 없이 완료되고 `package-lock.json`이 최신 상태를 유지한다.
  - `node_modules` 디렉터리가 생성되어 후속 스크립트에서 의존성을 로드할 수 있다.

## US-02: 개발 서버 실행
- **As a** 백엔드/프론트엔드 통합 개발자
- **I want** 단일 명령으로 API와 정적 프런트엔드를 동시에 띄우고 싶다
- **So that** 실시간으로 Mindmap/Outline/Details 패널을 확인하며 기능을 검증할 수 있다
- **Command**
  ```bash
  npm run dev
  ```
- **Acceptance Criteria**
  - 서버가 기본 포트(`4000`)에서 시작하거나 이미 사용 중이면 다음 사용 가능한 포트로 자동 이동한다.
  - 브라우저에서 `http://localhost:4000` (또는 대체 포트) 접속 시 최신 UI가 로드되고 Mindmap 데이터가 표시된다.

## US-03: 단위 및 통합 테스트 실행
- **As a** 품질 책임자
- **I want** 자동화된 테스트를 실행해 핵심 기능이 회귀 없이 동작하는지 확인하고 싶다
- **So that** 주요 API와 UI 로직이 변경 후에도 안정적으로 유지된다
- **Command**
  ```bash
  npm test
  ```
- **Acceptance Criteria**
  - Node.js 테스트 러너가 모든 스위트를 통과하며 실패나 예외가 발생하지 않는다.
  - ChatGPT 연동이 비활성화된 환경에서도 테스트가 통과하도록 목 기반 시뮬레이션이 적용된다.

## US-04: 프로덕션 번들 생성
- **As a** 배포 담당자
- **I want** 빌드 스크립트를 통해 정적 자산과 서버 번들을 생성하고 싶다
- **So that** 배포 대상 아티팩트를 `dist/` 폴더에서 바로 전달할 수 있다
- **Command**
  ```bash
  npm run build
  ```
- **Acceptance Criteria**
  - `dist/` 디렉터리에 최신 서버 및 정적 자산이 생성된다.
  - 빌드 스크립트가 종료 코드 0을 반환하고, 빌드 로그에 에러가 없다.

## US-05: 샘플 데이터셋 생성
- **As a** 실험용 사용자
- **I want** 다량의 사용자 스토리와 테스트가 포함된 샘플 데이터베이스를 생성하고 싶다
- **So that** Mindmap과 Heat Map 등의 기능을 부하 테스트에 활용할 수 있다
- **Command**
  ```bash
  npm run generate:sample-db
  ```
- **Acceptance Criteria**
  - `scripts/generate-sample-dataset.mjs`가 실행되어 `dist/datasets/` 이하에 샘플 SQLite 파일을 생성한다.
  - 실행 로그에 생성된 사용자 스토리/테스트 수량이 출력되고, 기존 파일은 필요한 경우 덮어쓴다.

## US-06: 런타임 데이터 백업
- **As a** 운영 관리자
- **I want** 현재 실행 중인 애플리케이션의 런타임 데이터를 SQLite 스냅샷으로 내려받고 싶다
- **So that** 환경 복구나 외부 공유를 안전하게 수행할 수 있다
- **Command**
  ```bash
  curl -o runtime-data.sqlite http://localhost:4000/api/runtime-data
  ```
- **Acceptance Criteria**
  - 응답 파일 헤더가 SQLite 매직 바이트(`SQLite format 3`)로 시작한다.
  - 내려받은 파일을 `sqlite3 runtime-data.sqlite '.tables'`로 검사하면 `stories`, `acceptance_tests`, `reference_documents`, `tasks` 등이 존재한다.

---

위 사용자 스토리 목록을 순차적으로 수행하면 현재 저장소에서 구현된 AI Project Manager Mindmap 애플리케이션을 동일한 결과물로 재현할 수 있습니다.
