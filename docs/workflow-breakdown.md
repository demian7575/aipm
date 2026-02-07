# Workflow breakdown: enqueue → session pool → template execution → commit/push → status update

This workflow aligns with the current AIPM architecture by tracing a task from enqueue through execution and status updates, and it defines GWT (Given/When/Then) acceptance criteria suitable for gating tests.

## 1) Enqueue
**Purpose:** Accept a task request and persist it for worker pickup.

**Inputs/Outputs**
- **Inputs:** Story/task identifier, repo reference, instructions, requester identity.
- **Outputs:** Persisted task record with an initial status (e.g., `queued`) and an enqueue acknowledgement.

**GWT acceptance criteria (gating tests)**
- **Given** a valid story ID and task payload, **when** the enqueue endpoint is called, **then** a task record is created with status `queued`, and the response includes the task ID.
- **Given** a missing or invalid required field, **when** the enqueue endpoint is called, **then** the response is a validation error and no task record is created.
- **Given** a valid task payload, **when** the enqueue endpoint is called, **then** the task is visible in the task store/queue with a timestamp and requester identity.

## 2) Session pool
**Purpose:** Allocate an available worker session to process the queued task.

**Inputs/Outputs**
- **Inputs:** Queued task ID, pool availability/health.
- **Outputs:** A reserved session handle bound to the task, or a retry/deferral if no capacity.

**GWT acceptance criteria (gating tests)**
- **Given** at least one healthy session in the pool, **when** a queued task is polled, **then** the task is assigned to a session and marked `in_progress` (or equivalent).
- **Given** no healthy sessions in the pool, **when** a queued task is polled, **then** the task remains `queued` and the poller records a deferral reason.
- **Given** a session is assigned, **when** the worker starts execution, **then** the session is locked to the task until completion or failure.

## 3) Template execution
**Purpose:** Run the workflow template (prompt + tooling) to produce code changes and artifacts.

**Inputs/Outputs**
- **Inputs:** Task payload, repo checkout/branch context, execution template.
- **Outputs:** Modified working tree, logs, and execution artifacts.

**GWT acceptance criteria (gating tests)**
- **Given** a task with a valid template reference, **when** execution starts, **then** the template steps run in order and emit a structured log for each step.
- **Given** a template step fails, **when** execution halts, **then** the task status is updated to `failed` with a reason and the session is released.
- **Given** execution completes successfully, **when** the working tree is inspected, **then** there are staged or unstaged changes consistent with the template outputs.

## 4) Commit/push
**Purpose:** Persist changes to the VCS and publish them to the remote for review.

**Inputs/Outputs**
- **Inputs:** Modified working tree, commit message template, target branch.
- **Outputs:** Commit SHA and a pushed remote branch (or error state).

**GWT acceptance criteria (gating tests)**
- **Given** a clean repo with valid changes, **when** the commit step runs, **then** a commit is created with the expected message format and author.
- **Given** a successful commit, **when** the push step runs, **then** the remote branch is updated and the commit SHA is returned.
- **Given** push fails (e.g., auth or remote rejection), **when** the push step runs, **then** the task status is updated to `failed` with the push error details.

## 5) Status update
**Purpose:** Update the task/story status for user visibility and downstream automation.

**Inputs/Outputs**
- **Inputs:** Task result (success/failure), commit SHA/branch, error details if any.
- **Outputs:** Updated status in the task/story system and a visible completion signal.

**GWT acceptance criteria (gating tests)**
- **Given** a successful commit and push, **when** the status update runs, **then** the task/story is marked `complete` and includes the commit SHA and branch.
- **Given** execution fails at any step, **when** the status update runs, **then** the task/story is marked `failed` with the failure reason.
- **Given** the status update API is unavailable, **when** an update is attempted, **then** a retry policy is recorded and the task remains in a retryable state.
