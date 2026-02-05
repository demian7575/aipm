content = r"""# RTM (Requirement Traceability Matrix) View Spec — AIPM

## What RTM is
RTM (Requirement Traceability Matrix) is a **single screen** that makes traceability **visible and measurable**.

RTM answers, for every Requirement:
- **Is it decomposed?** (Requirement → Stories)
- **Is it verifiable?** (Requirement → Acceptance Tests)
- **Is it implemented?** (Requirement → Code/PR/Commit)
- **Is it documented?** (Requirement → Docs)
- **Is it protected by execution?** (Requirement → CI/Test Runs)

RTM is not a list of links. It is a **coverage matrix** with **counts + status** per requirement, and **drill-down evidence** per cell.

---

## RTM View: Visual Structure

### Page layout (must-have)
1) **Top tab bar**
- Tabs must include: `Mindmap | Kanban | RTM`
- Selecting RTM shows the RTM page.

2) **Toolbar (one row, fixed at top)**
Left-to-right controls (exact order):
- `Scope selector` (if AIPM supports scope concept; otherwise hide)
- `Requirement root selector` (if hierarchy exists; otherwise hide)
- `Search` input (filters requirement rows)
- Toggle: `Show gaps only`
- Button: `Export CSV`

3) **Matrix grid (main content)**
- Left frozen area: Requirement identification
- Right scrollable area: Coverage columns grouped by artifact type
- Horizontal scroll for columns; vertical scroll for rows

4) **Right-side detail drawer**
- Opens when a matrix cell is clicked
- Shows evidence list (linked artifacts) for the clicked cell

---

## Matrix Definition (Rows, Columns, Cells)

### Rows (Requirements)
Each row represents exactly **one Requirement**.

Row must display:
- `Requirement ID` (unique identifier)
- `Requirement Title` (human-readable)
- `Hierarchy indentation` (if requirements have parent/child)
- `Requirement status` (if exists: e.g., Draft/Approved/Deprecated)

Sorting default:
- Preserve requirement order from the source (or by hierarchy order if available).

### Columns (Coverage types)
Columns are **exactly five groups** in this order:
1) **Stories**
2) **Acceptance Tests**
3) **Code**
4) **Docs**
5) **CI**

Each group contains exactly **one column** in MVP (one metric per type):
- Stories: `#`
- Acceptance Tests: `#`
- Code: `#`
- Docs: `#`
- CI: `#`

(You may add more columns later, but MVP is one column per group.)

### Cell representation (what a cell shows)
Each cell shows:
- A **count** (integer ≥ 0)
- A **state** derived from count/status

#### Cell state rules (deterministic)
For **Stories / Code / Docs**:
- `count = 0` → state = `GAP`
- `count > 0` → state = `COVERED`

For **Acceptance Tests**:
- `count = 0` → state = `GAP`
- `count > 0` AND `latestTestStatus = PASS` → state = `COVERED_PASS`
- `count > 0` AND `latestTestStatus = FAIL` → state = `COVERED_FAIL`
- If latest test status does not exist in data → treat as `COVERED` (no pass/fail badge)

For **CI**:
- `count = 0` → state = `GAP`
- `count > 0` AND `latestCiStatus = PASS` → state = `COVERED_PASS`
- `count > 0` AND `latestCiStatus = FAIL` → state = `COVERED_FAIL`
- If latest CI status does not exist in data → treat as `COVERED`

#### Clickability
- Every cell is clickable.
- Clicking a cell opens the detail drawer for that `(Requirement, CoverageType)`.

---

## Traceability Semantics (What “linked” means)

RTM uses the project’s existing trace model. If multiple models exist, precedence is:

1) Explicit trace links (Requirement ↔ Artifact)
2) Artifact has `requirementIds[]` referencing requirement
3) Transitive linkage via story:
   - Requirement → Story → Acceptance Tests
   - Requirement → Story → Code
   - Requirement → Story → CI (if CI links to story/test)

RTM must be consistent: **same input data always yields the same counts.**

---

## Functional Requirements (each capability)

### 1) Requirement row rendering
**Intent:** user can scan requirements and their coverage.

**Requirements:**
- Show all requirements in selected scope/root.
- If hierarchy exists, indent children under parents.
- Row height is consistent.
- Requirement column remains visible when horizontally scrolling.

**Acceptance criteria:**
- When user scrolls horizontally, requirement ID/title remain visible.
- When user searches, only matching requirement rows remain.

---

### 2) Search (`q`)
**Intent:** user can find a requirement instantly.

**Behavior:**
- Search filters rows by:
  - requirement ID substring match OR
  - requirement title substring match
- Case-insensitive.
- Applies immediately on input change (no “Search” button).

**Acceptance criteria:**
- Given requirements list, when user types a substring, only matching rows remain.

---

### 3) Show gaps only
**Intent:** user sees only requirements that are missing required evidence.

**Definition of “gap requirement” (MVP, unambiguous):**
A requirement is a “gap requirement” if:
- `Stories count = 0` OR `Acceptance Tests count = 0`

**Behavior:**
- Toggle ON → show only gap requirements
- Toggle OFF → show all

**Acceptance criteria:**
- Given one requirement with `stories=0` and another with `stories>0`, when `gapsOnly=ON`, only the first appears.

---

### 4) Drill-down drawer (cell click)
**Intent:** user can see evidence, not just counts.

**Open condition:**
- Clicking any cell opens the drawer.

**Drawer content (must-have):**
Header:
- Requirement ID + Title
- Coverage type (Stories / Tests / Code / Docs / CI)

Body:
- List of linked artifacts for that cell’s type.
Each list item shows:
- Artifact ID
- Artifact Title (or filename/PR title)
- Artifact status if available (e.g., test pass/fail, PR merged/open)

Actions:
- Clicking an item navigates to the artifact detail page (if exists).
- If no detail route exists, provide a stable link target (e.g., external URL or a placeholder view).

Empty state:
- If `count=0`, drawer shows **“No linked items”** and nothing else.

**Acceptance criteria:**
- Clicking a non-zero cell shows a list with exactly `count` items (or equal to the deduplicated count if duplicates exist).
- Clicking a zero cell shows the empty state.

---

### 5) Counting rules (deduplication)
**Intent:** counts are stable and not inflated.

**Rules:**
- Deduplicate by artifact unique identifier.
- If multiple links point to the same artifact, count it once.
- If artifact is reachable via both explicit and transitive link, count it once.

**Acceptance criteria:**
- Given two links to the same story, `storyCount` must be `1`.

---

### 6) Status rules for Tests and CI
**Intent:** user sees risk quickly.

**Latest status definition:**
- Latest = artifact with greatest timestamp among executions relevant to this requirement.
- If timestamps don’t exist, latest status is `UNKNOWN` (no pass/fail state).

**Failing indicator:**
- If latest status is `FAIL` → cell state is `COVERED_FAIL`.
- Else if `PASS` → cell state is `COVERED_PASS`.
- Else → `COVERED`.

**Acceptance criteria:**
- Given tests exist and latest is FAIL, tests cell shows failing state.
- Given tests exist and latest is PASS, tests cell shows pass state.

---

### 7) Export CSV
**Intent:** user can take coverage snapshot and share.

**Export content:**
Export includes current filtered rows only (respect Search + gapsOnly + scope/root).
CSV columns (exact order):
1) `requirementId`
2) `requirementTitle`
3) `storyCount`
4) `testCount`
5) `codeCount`
6) `docCount`
7) `ciCount`
8) `testsLatestStatus` (`PASS`/`FAIL`/`UNKNOWN`)
9) `ciLatestStatus` (`PASS`/`FAIL`/`UNKNOWN`)

**Acceptance criteria:**
- Export reflects current filters.
- CSV row count equals visible requirement row count.

---

### 8) Performance requirements (non-negotiable)
**Intent:** RTM stays usable on large requirement sets.

**Requirements:**
- RTM must support at least **500 requirements** without freezing the UI.
- Matrix rendering must avoid rendering every DOM cell if dataset is large (use virtualization or equivalent strategy).
- Drawer opening must occur within **300ms** for typical dataset sizes.

(If the app is currently small-scale demo, implement structure so virtualization can be added without redesign.)

---

## Optional but Valuable (explicitly optional)

### A) Coverage summary strip
- Show coverage % at top:
  - % with stories>0
  - % with tests>0
  - % with ci>0
- Must update with filters.

### B) Requirement subtree selection
- Allow selecting a requirement as root to limit matrix to that subtree.

### C) Column visibility toggle
- Allow hide/show Code/Docs/CI columns.

---

## Minimal “Definition of Done” checklist
RTM is considered complete when all are true:
- RTM tab exists beside Mindmap/Kanban and route loads.
- Matrix shows requirement rows + five coverage columns.
- Search works as defined.
- Show gaps only works as defined.
- Clicking any cell opens drawer with correct evidence list or empty state.
- CSV export matches visible data and includes required columns.
- Counts are deduplicated and deterministic.
- Tests/CI cells show pass/fail state when latest status exists.
"""
path = "/mnt/data/AIPM_RTM_View_Spec.md"
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
path

