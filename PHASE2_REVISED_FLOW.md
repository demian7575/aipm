# Phase 2 플로우 재구성 및 Cascade Delete 분석

## 새로운 Phase 2 플로우

### Step 0: Story Draft Generation (AI)
- **목적**: AI를 사용하여 User Story 초안 생성
- **Semantic API 호출**: `/aipm/story-draft` (POST-aipm-story-draft.md)
- **Kiro CLI 사용**: ✅

### Step 1: Create User Story
- **목적**: User Story 생성 (INVEST Analysis 자동 실행)
- **Backend API 호출**: `/api/stories` POST
- **Semantic API 호출**: `/aipm/invest-analysis` (자동)
- **Kiro CLI 사용**: ✅ (INVEST Analysis)
- **생성 데이터**: Story + INVEST Analysis 결과

### Step 2: Acceptance Test Draft Generation (AI)
- **목적**: AI를 사용하여 Acceptance Test 초안 생성
- **Semantic API 호출**: `/aipm/acceptance-test-draft` (POST-aipm-acceptance-test-draft.md)
- **Kiro CLI 사용**: ✅

### Step 3: Create Acceptance Test
- **목적**: Step 2에서 생성된 초안으로 Acceptance Test 생성
- **Backend API 호출**: `/api/stories/{id}/acceptance-tests` POST
- **Kiro CLI 사용**: ❌ (단순 CRUD)
- **생성 데이터**: Acceptance Test (Story에 연결)

### Step 4: Story Hierarchy Check
- **목적**: Parent-Child Story 관계 테스트
- **Backend API 호출**: `/api/stories` POST (Parent + Child)
- **Semantic API 호출**: `/aipm/invest-analysis` (각 Story마다 자동)
- **Kiro CLI 사용**: ✅ (INVEST Analysis × 2)
- **생성 데이터**: Parent Story + Child Story

### Step 5: GitHub Integration (PR Creation)
- **목적**: Story에 대한 PR 생성
- **Backend API 호출**: `/api/stories/{id}/create-pr` POST
- **Kiro CLI 사용**: ❌
- **생성 데이터**: PR 정보 (Story에 연결)

### Step 6: Code Generation (Real)
- **목적**: AI를 사용한 코드 생성
- **Semantic API 호출**: `/aipm/code-generation` (POST-aipm-code-generation.md)
- **Kiro CLI 사용**: ✅

### Step 7: User Story Deletion (Cascade)
- **목적**: Story 삭제 시 연결된 모든 데이터 cascade 삭제
- **Backend API 호출**: `/api/stories/{id}` DELETE
- **Kiro CLI 사용**: ❌
- **삭제 데이터**:
  1. **Acceptance Tests** (story_id로 연결된 모든 테스트)
  2. **PRs** (storyId로 연결된 모든 PR)
  3. **Story** (자체)

---

## Cascade Delete 구현 분석

### 현재 구현 (수정 전)
```javascript
// Story만 삭제, PR만 삭제
DELETE FROM user_stories WHERE id = ?
DELETE FROM story_prs WHERE storyId = ?
```
**문제점**: Acceptance Tests가 삭제되지 않음 ❌

### 수정된 구현 (수정 후)
```javascript
// 1. Acceptance Tests 삭제
DELETE FROM acceptance_tests WHERE story_id = ?

// 2. Story 삭제
DELETE FROM user_stories WHERE id = ?

// 3. PRs 삭제
DELETE FROM story_prs WHERE storyId = ?
```

### DynamoDB 구현
```javascript
// 1. Query acceptance tests by storyId
QueryCommand({
  TableName: 'aipm-backend-prod-acceptance-tests',
  IndexName: 'storyId-index',
  KeyConditionExpression: 'storyId = :storyId'
})

// 2. Delete each acceptance test
for (const test of queryResult.Items) {
  DeleteCommand({ TableName: testsTable, Key: { id: test.id } })
}

// 3. Delete story
DeleteCommand({ TableName: storiesTable, Key: { id: storyId } })
```

---

## 삭제 순서 및 의존성

```
Story (id: 123)
├── Acceptance Tests (story_id: 123)
│   ├── Test 1 (id: 456)
│   ├── Test 2 (id: 457)
│   └── Test 3 (id: 458)
├── PRs (storyId: 123)
│   ├── PR #1
│   └── PR #2
└── Child Stories (parent_id: 123)
    └── Child Story (id: 124)
```

### 삭제 순서
1. **Acceptance Tests** 먼저 삭제 (Foreign Key 제약)
2. **PRs** 삭제
3. **Story** 마지막 삭제

### 주의사항
- **Child Stories는 삭제하지 않음** (Parent만 삭제, Child는 orphan 상태로 유지)
- **Gating Tests**: Acceptance Test에 연결된 Gating Test는 현재 구조에 없음
  - 향후 추가 시 Acceptance Test 삭제 전에 먼저 삭제 필요

---

## 테스트 검증 항목

### Step 7 테스트에서 확인할 사항
1. ✅ Story가 삭제되었는지 (GET /api/stories/{id} → 404)
2. ✅ Acceptance Tests가 모두 삭제되었는지
3. ✅ PRs가 모두 삭제되었는지
4. ✅ 삭제 전 Acceptance Test 개수 확인
5. ✅ Cascade 삭제 로그 확인

---

## 예상 Semantic API 호출 횟수 (Phase 2 Real)

| Step | API 호출 | 횟수 |
|------|---------|------|
| Step 0 | Story Draft | 1 |
| Step 1 | INVEST Analysis (자동) | 1 |
| Step 2 | Acceptance Test Draft | 1 |
| Step 3 | - | 0 |
| Step 4 | INVEST Analysis (Parent) | 1 |
| Step 4 | INVEST Analysis (Child) | 1 |
| Step 5 | - | 0 |
| Step 6 | Code Generation | 1 |
| Step 7 | - | 0 |
| **총계** | | **6회** |

**이전 (10회) → 수정 후 (6회)**: 40% 감소 ✅
