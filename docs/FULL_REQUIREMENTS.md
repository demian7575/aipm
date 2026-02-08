# AIPM Full Requirements (200 User Stories)

This document provides a complete, implementation-aligned requirements catalog for AIPM. Each user story includes **As-a / I-want / So-that** plus **Given/When/Then** acceptance criteria so it can be converted to automated gating tests.

---

## Epic 1 — UI: RTM View (20)

**US-RTM-001 — RTM tab visible**  
As a QA lead, I want an RTM tab, so that I can access traceability.  
GWT: Given the app loads, When I click RTM, Then the RTM view renders.

**US-RTM-002 — Requirement rows render**  
As a QA lead, I want requirements shown as rows, so that coverage is visible.  
GWT: Given requirements exist, When RTM renders, Then each requirement appears once.

**US-RTM-003 — Frozen requirement column**  
As a QA lead, I want ID/title frozen, so that they stay visible while scrolling.  
GWT: Given horizontal scroll, When I scroll, Then ID/title remain visible.

**US-RTM-004 — Coverage columns present**  
As a QA lead, I want Stories/Tests/Code/Docs/CI columns, so that evidence is visible.  
GWT: Given RTM loads, When I view columns, Then five coverage groups appear.

**US-RTM-005 — Cell counts display**  
As a QA lead, I want counts in cells, so that coverage is measurable.  
GWT: Given links exist, When RTM renders, Then counts match deduped totals.

**US-RTM-006 — GAP state for zero**  
As a QA lead, I want GAP styling for zero count, so that gaps are obvious.  
GWT: Given count=0, When RTM renders, Then GAP state is shown.

**US-RTM-007 — PASS/FAIL badges**  
As a QA lead, I want pass/fail badges for tests/CI, so that risk is visible.  
GWT: Given latest status, When RTM renders, Then PASS/FAIL badge appears.

**US-RTM-008 — Search by ID**  
As a QA lead, I want search by ID, so that I can find requirements quickly.  
GWT: Given rows, When I type an ID substring, Then only matches remain.

**US-RTM-009 — Search by title**  
As a QA lead, I want search by title, so that I can locate by name.  
GWT: Given rows, When I type a title substring, Then only matches remain.

**US-RTM-010 — Gaps-only filter**  
As a QA lead, I want “Show gaps only,” so that I focus on missing items.  
GWT: Given mixed coverage, When gaps-only is enabled, Then only gap rows show.

**US-RTM-011 — Drawer opens on cell click**  
As a QA lead, I want a drawer on cell click, so that I can inspect evidence.  
GWT: Given a cell, When I click it, Then a drawer opens.

**US-RTM-012 — Drawer lists evidence**  
As a QA lead, I want linked items listed, so that I can verify evidence.  
GWT: Given count>0, When drawer opens, Then it lists each linked artifact.

**US-RTM-013 — Drawer empty state**  
As a QA lead, I want “No linked items,” so that gaps are explicit.  
GWT: Given count=0, When drawer opens, Then empty state is shown.

**US-RTM-014 — Export CSV**  
As a QA lead, I want CSV export, so that I can share snapshots.  
GWT: Given filters applied, When I export, Then CSV matches visible rows.

**US-RTM-015 — Group headers**  
As a QA lead, I want grouped headers, so that the matrix is readable.  
GWT: Given RTM loads, When I view headers, Then group labels appear.

**US-RTM-016 — Requirement status visible**  
As a QA lead, I want requirement status shown, so that lifecycle is clear.  
GWT: Given status data, When RTM renders, Then status displays.

**US-RTM-017 — Hierarchy indentation**  
As a QA lead, I want indentation, so that parent/child context is clear.  
GWT: Given hierarchy, When RTM renders, Then children are indented.

**US-RTM-018 — Virtualized rendering**  
As a QA lead, I want virtualization, so that large sets are responsive.  
GWT: Given 500+ rows, When RTM loads, Then scrolling remains smooth.

**US-RTM-019 — Drawer item navigation**  
As a QA lead, I want item links, so that I can navigate to evidence.  
GWT: Given drawer items, When I click one, Then it navigates to detail.

**US-RTM-020 — Preserve selection**  
As a QA lead, I want selection preserved, so that I can continue analysis.  
GWT: Given a selected requirement, When I refresh, Then selection restores if available.

---

## Epic 2 — UI: Kanban View (18)

**US-KB-001 — Kanban tab visible**  
As a user, I want a Kanban tab, so that I can manage status visually.  
GWT: Given app loads, When I click Kanban, Then Kanban renders.

**US-KB-002 — Status columns present**  
As a user, I want Draft/Ready/In Progress/Approved/Done columns.  
GWT: Given Kanban loads, When I view columns, Then all statuses appear.

**US-KB-003 — Story cards render**  
As a user, I want stories as cards, so that I can scan work items.  
GWT: Given stories exist, When Kanban renders, Then each appears in a column.

**US-KB-004 — Drag to change status**  
As a user, I want drag-and-drop, so that I can update status quickly.  
GWT: Given a card, When I drag to another column, Then status updates.

**US-KB-005 — Block invalid transitions**  
As a user, I want invalid moves blocked, so that workflow rules are enforced.  
GWT: Given invalid transition, When I attempt move, Then it is rejected with reason.

**US-KB-006 — Status updates persist**  
As a user, I want status updates saved, so that refresh keeps state.  
GWT: Given a move, When I reload, Then status remains updated.

**US-KB-007 — Card quick details**  
As a user, I want quick details, so that I can inspect without leaving view.  
GWT: Given a card, When I open details, Then a summary appears.

**US-KB-008 — Filter by assignee**  
As a user, I want assignee filters, so that I can focus on assigned work.  
GWT: Given filters, When I select assignee, Then only matching cards show.

**US-KB-009 — Filter by component**  
As a user, I want component filters, so that I can view relevant areas.  
GWT: Given components, When I filter, Then only matching cards show.

**US-KB-010 — Kanban search**  
As a user, I want search, so that I can find stories quickly.  
GWT: Given cards, When I search, Then only matches remain.

**US-KB-011 — WIP counts**  
As a user, I want WIP counts, so that I can monitor load.  
GWT: Given cards, When Kanban renders, Then counts show per column.

**US-KB-012 — Hide Done column**  
As a user, I want an option to hide Done, so that I focus on active work.  
GWT: Given hide-Done enabled, When Kanban renders, Then Done column hides.

**US-KB-013 — Swimlanes by component**  
As a user, I want swimlanes, so that cross-team view is possible.  
GWT: Given swimlane mode, When enabled, Then cards group by component.

**US-KB-014 — Multi-select bulk update**  
As a user, I want multi-select, so that I can update multiple stories.  
GWT: Given multiple selected cards, When I update status, Then all update.

**US-KB-015 — Transition error messaging**  
As a user, I want clear errors, so that I know why a move failed.  
GWT: Given invalid move, When it fails, Then error reason is displayed.

**US-KB-016 — Keyboard navigation**  
As a user, I want keyboard support, so that accessibility is improved.  
GWT: Given Kanban focus, When I use arrows, Then focus moves between cards.

**US-KB-017 — Persist Kanban settings**  
As a user, I want filters saved, so that preferences persist.  
GWT: Given filters set, When I reload, Then filters are restored.

**US-KB-018 — Performance for large boards**  
As a user, I want smooth scrolling, so that large boards remain usable.  
GWT: Given 200+ cards, When I scroll, Then UI remains responsive.

---

## Epic 3 — UI: Mindmap View (18)

**US-MM-001 — Mindmap tab visible**  
As a user, I want a Mindmap tab, so that I can visualize hierarchy.  
GWT: Given app loads, When I click Mindmap, Then Mindmap renders.

**US-MM-002 — Nodes render per story**  
As a user, I want nodes for stories, so that scope is visible.  
GWT: Given stories exist, When Mindmap loads, Then nodes appear.

**US-MM-003 — Edges show parent-child**  
As a user, I want edges, so that hierarchy is visible.  
GWT: Given parentId links, When Mindmap renders, Then edges appear.

**US-MM-004 — Node selection syncs**  
As a user, I want selection sync with details, so that editing is immediate.  
GWT: Given a node, When I click it, Then Details panel shows that story.

**US-MM-005 — Outline sync**  
As a user, I want outline selection to sync, so that navigation stays consistent.  
GWT: Given a node, When I click it, Then outline highlights same story.

**US-MM-006 — Auto layout toggle**  
As a user, I want auto layout toggle, so that I can adjust layout.  
GWT: Given toggle exists, When I disable it, Then manual positions persist.

**US-MM-007 — Save node positions**  
As a user, I want positions saved, so that layout persists.  
GWT: Given manual move, When I reload, Then node positions persist.

**US-MM-008 — Zoom controls**  
As a user, I want zoom controls, so that I can view large maps.  
GWT: Given controls, When I zoom, Then scale changes.

**US-MM-009 — Pan controls**  
As a user, I want panning, so that I can navigate.  
GWT: Given drag on canvas, When I drag, Then view pans.

**US-MM-010 — Label truncation**  
As a user, I want labels truncated, so that map is readable.  
GWT: Given long titles, When nodes render, Then labels truncate.

**US-MM-011 — Tooltip on hover**  
As a user, I want tooltips, so that full titles are readable.  
GWT: Given a node, When I hover, Then tooltip shows full title.

**US-MM-012 — Expand/collapse subtree**  
As a user, I want collapse, so that I can focus on subtrees.  
GWT: Given a node, When I collapse, Then children hide.

**US-MM-013 — Search highlight**  
As a user, I want search to highlight nodes, so that I can find stories.  
GWT: Given search term, When I search, Then matching nodes highlight.

**US-MM-014 — Performance for large trees**  
As a user, I want performance optimized, so that large trees render smoothly.  
GWT: Given 500 nodes, When Mindmap loads, Then it remains responsive.

**US-MM-015 — Add child via mindmap**  
As a user, I want to add child from node, so that creation is faster.  
GWT: Given a node, When I choose add child, Then a create flow opens.

**US-MM-016 — Status color coding**  
As a user, I want status colors, so that I can see progress at a glance.  
GWT: Given statuses, When nodes render, Then colors map to status.

**US-MM-017 — Focus root**  
As a user, I want focus on root, so that I can reset view.  
GWT: Given focus control, When I click it, Then view centers on root.

**US-MM-018 — Mindmap export image**  
As a user, I want export, so that I can share visuals.  
GWT: Given mindmap, When I export, Then an image is generated.

---

## Epic 4 — Frontend Core (18)

**US-FE-001 — Config load**  
As a developer, I want config from environment, so that API endpoints are correct.  
GWT: Given config file, When app starts, Then API URLs match environment.

**US-FE-002 — API error banner**  
As a user, I want error banners, so that I know why a request failed.  
GWT: Given an API error, When it occurs, Then an error banner appears.

**US-FE-003 — Retry control**  
As a user, I want retry on failure, so that transient issues are recoverable.  
GWT: Given a failed call, When I click retry, Then the request is retried.

**US-FE-004 — SSE reconnect**  
As a user, I want SSE reconnects, so that streaming continues.  
GWT: Given SSE disconnect, When it reconnects, Then streaming resumes.

**US-FE-005 — Persist workspace layout**  
As a user, I want layout saved, so that my workspace persists.  
GWT: Given layout changed, When I reload, Then layout restores.

**US-FE-006 — Persist selection**  
As a user, I want selection saved, so that I can resume where I left off.  
GWT: Given selection, When I reload, Then selection restores if available.

**US-FE-007 — Local cache story list**  
As a user, I want caching, so that reloads are faster.  
GWT: Given cached list, When I reload, Then list loads quickly then refreshes.

**US-FE-008 — Loading indicators**  
As a user, I want loading spinners, so that I know actions are in progress.  
GWT: Given a request, When it starts, Then a loading indicator is shown.

**US-FE-009 — Modal focus management**  
As a user, I want modals to manage focus, so that accessibility is preserved.  
GWT: Given a modal open, When I press Tab, Then focus cycles within modal.

**US-FE-010 — Escape closes modal**  
As a user, I want Escape to close modal, so that I can cancel quickly.  
GWT: Given modal open, When I press Escape, Then modal closes.

**US-FE-011 — Form validation inline**  
As a user, I want validation inline, so that errors are clear.  
GWT: Given invalid input, When I submit, Then validation messages show.

**US-FE-012 — Story creation modal**  
As a user, I want a story creation modal, so that I can add stories fast.  
GWT: Given I click “Add story”, When modal opens, Then fields are editable.

**US-FE-013 — Child story modal**  
As a user, I want parent preselected, so that child stories link correctly.  
GWT: Given a parent selected, When I add child, Then parentId is preset.

**US-FE-014 — Detail panel updates**  
As a user, I want details to update on selection, so that I see current info.  
GWT: Given a story, When I select it, Then details panel updates.

**US-FE-015 — Undo last action**  
As a user, I want undo for edits, so that I can recover mistakes.  
GWT: Given a change, When I undo, Then previous values restore.

**US-FE-016 — Autosave drafts**  
As a user, I want autosave drafts, so that I don’t lose work.  
GWT: Given editing, When I pause, Then draft is saved locally.

**US-FE-017 — Keyboard shortcuts**  
As a user, I want shortcuts, so that actions are faster.  
GWT: Given shortcuts enabled, When I press key combo, Then action triggers.

**US-FE-018 — Accessibility labels**  
As a user, I want ARIA labels, so that screen readers work.  
GWT: Given UI controls, When inspected, Then ARIA labels are present.

---

## Epic 5 — Backend: Story API (18)

**US-BE-001 — Create story endpoint**  
As a client, I want POST /api/stories, so that I can create a story.  
GWT: Given valid payload, When POST, Then story returns with id.

**US-BE-002 — Update story endpoint**  
As a client, I want PATCH /api/stories/:id, so that I can update fields.  
GWT: Given story exists, When PATCH, Then changes persist.

**US-BE-003 — Delete story endpoint**  
As a client, I want DELETE /api/stories/:id, so that I can remove stories.  
GWT: Given story exists, When DELETE, Then story is removed.

**US-BE-004 — Get story list**  
As a client, I want GET /api/stories, so that I can load the tree.  
GWT: Given stories exist, When GET, Then list includes id and parentId.

**US-BE-005 — Validate required fields**  
As a client, I want validation, so that malformed data is rejected.  
GWT: Given missing title, When POST, Then 400 returned.

**US-BE-006 — Default status**  
As a client, I want default Draft, so that workflow starts consistently.  
GWT: Given no status, When creating, Then status is Draft.

**US-BE-007 — INVEST heuristic checks**  
As a client, I want INVEST warnings, so that quality improves.  
GWT: Given story saved, When heuristics run, Then warnings stored.

**US-BE-008 — Accept warnings override**  
As a client, I want override flag, so that I can proceed with warnings.  
GWT: Given warnings, When override set, Then save succeeds.

**US-BE-009 — Done gating**  
As a client, I want Done validation, so that untested stories aren’t closed.  
GWT: Given no tests, When status set to Done, Then system blocks or warns.

**US-BE-010 — Bulk story fetch**  
As a client, I want efficient fetch, so that UI loads quickly.  
GWT: Given 500 stories, When GET, Then response time remains acceptable.

**US-BE-011 — Story search endpoint**  
As a client, I want search by title, so that I can find stories.  
GWT: Given stories, When I search, Then matching items return.

**US-BE-012 — Story hierarchy integrity**  
As a client, I want parentId validated, so that links are valid.  
GWT: Given invalid parentId, When saving, Then error is returned.

**US-BE-013 — Story audit timestamps**  
As a client, I want createdAt/updatedAt, so that history is traceable.  
GWT: Given update, When PATCH, Then updatedAt changes.

**US-BE-014 — Story components stored**  
As a client, I want components saved, so that filtering works.  
GWT: Given components, When saving, Then they persist.

**US-BE-015 — Story assignee stored**  
As a client, I want assignee stored, so that ownership is visible.  
GWT: Given assignee, When saving, Then it persists.

**US-BE-016 — Story status history (optional)**  
As a client, I want status changes logged, so that lifecycle is auditable.  
GWT: Given status change, When saved, Then history entry exists.

**US-BE-017 — Health endpoint**  
As an operator, I want /health, so that readiness is observable.  
GWT: Given backend running, When /health called, Then ok response is returned.

**US-BE-018 — Config endpoint**  
As a client, I want config endpoint, so that UI can self-configure.  
GWT: Given backend running, When /api/config called, Then config is returned.

---

## Epic 6 — Backend: Acceptance Tests (12)

**US-AT-001 — Create test endpoint**  
As a QA/SDET, I want POST /api/stories/:id/tests, so that I can add GWT tests.  
GWT: Given story exists, When POST, Then test is stored.

**US-AT-002 — Update test endpoint**  
As a QA/SDET, I want PATCH /api/acceptance-tests/:id, so that I can edit steps.  
GWT: Given test exists, When PATCH, Then test updates.

**US-AT-003 — Delete test endpoint**  
As a QA/SDET, I want DELETE /api/acceptance-tests/:id, so that I can remove tests.  
GWT: Given test exists, When DELETE, Then it is removed.

**US-AT-004 — List tests for story**  
As a QA/SDET, I want GET tests by story, so that I can see coverage.  
GWT: Given tests exist, When I fetch by storyId, Then linked tests return.

**US-AT-005 — GWT field validation**  
As a QA/SDET, I want given/when/then required, so that tests are usable.  
GWT: Given missing step, When POST, Then validation error is returned.

**US-AT-006 — Test status values**  
As a QA/SDET, I want status Draft/Pass/Fail, so that results are clear.  
GWT: Given status set, When saved, Then status persists.

**US-AT-007 — Test timestamps**  
As a QA/SDET, I want createdAt/updatedAt, so that edits are traceable.  
GWT: Given update, When PATCH, Then updatedAt changes.

**US-AT-008 — Test ordering**  
As a QA/SDET, I want stable ordering, so that UI shows predictable sequence.  
GWT: Given multiple tests, When listed, Then order is stable.

**US-AT-009 — Bulk test import**  
As a QA/SDET, I want bulk import, so that I can add multiple tests quickly.  
GWT: Given multiple tests, When bulk import, Then all tests persist.

**US-AT-010 — Auto-generate tests (optional)**  
As a QA/SDET, I want auto-generate on child creation, so that coverage is seeded.  
GWT: Given auto-gen enabled, When child story created, Then tests are added.

**US-AT-011 — UI sync on edit**  
As a QA/SDET, I want UI updated after edit, so that I see changes immediately.  
GWT: Given edit, When save completes, Then UI refreshes tests.

**US-AT-012 — Delete removes from UI**  
As a QA/SDET, I want delete to remove from UI, so that consistency holds.  
GWT: Given delete, When completed, Then test is removed from UI and API.

---

## Epic 7 — DynamoDB Model (14)

**US-DB-001 — Stories required fields**  
As a system operator, I want required fields enforced, so that integrity is preserved.  
GWT: Given a story, When stored, Then id/title/status/timestamps exist.

**US-DB-002 — Parent-child stored**  
As a system operator, I want parentId stored, so that hierarchy reconstructs.  
GWT: Given parentId, When saved, Then parentId persists.

**US-DB-003 — Components stored**  
As a system operator, I want components stored, so that filtering works.  
GWT: Given components, When stored, Then components persist.

**US-DB-004 — Acceptance tests required fields**  
As a system operator, I want tests stored with storyId and GWT fields.  
GWT: Given test, When stored, Then storyId/given/when/then exist.

**US-DB-005 — storyId-index present**  
As a system operator, I want GSI on storyId, so that queries are efficient.  
GWT: Given tests, When querying by storyId, Then results are returned.

**US-DB-006 — CamelCase storage**  
As a system, I want camelCase storage, so that backend and frontend match.  
GWT: Given stored item, When read, Then fields are camelCase.

**US-DB-007 — Snake_case compatibility output**  
As a system, I want snake_case outputs for legacy, so that compatibility holds.  
GWT: Given tests, When listed, Then when_step/then_step are returned.

**US-DB-008 — Dev/prod isolation**  
As a system operator, I want separate tables per environment, so that data is isolated.  
GWT: Given STAGE=dev, When storing, Then dev tables are used.

**US-DB-009 — Backup/export support**  
As a system operator, I want backup/export procedure, so that recovery is possible.  
GWT: Given data exists, When backup runs, Then export artifacts are produced.

**US-DB-010 — Table existence check**  
As a system operator, I want table existence checks, so that startup validates config.  
GWT: Given missing table, When service starts, Then it fails with clear error.

**US-DB-011 — On-demand billing**  
As a system operator, I want on-demand configuration, so that scaling is automatic.  
GWT: Given table config, When inspected, Then billing mode is on-demand.

**US-DB-012 — IAM role access**  
As a system operator, I want IAM role access, so that no static keys are required.  
GWT: Given EC2 role, When accessing DynamoDB, Then operations succeed.

**US-DB-013 — Numeric IDs**  
As a system, I want numeric IDs, so that queries are consistent.  
GWT: Given creation, When saved, Then id is numeric.

**US-DB-014 — Test runs table (if enabled)**  
As a QA lead, I want test run records, so that RTM can show pass/fail.  
GWT: Given a run, When saved, Then latest run can be queried by storyId.

---

## Epic 8 — Semantic API (14)

**US-AI-001 — Story draft generation**  
As a user, I want AI drafts, so that I can create stories faster.  
GWT: Given an idea, When I request a draft, Then As/I want/So that are returned.

**US-AI-002 — Acceptance test generation**  
As a user, I want AI-generated GWT tests, so that coverage is seeded.  
GWT: Given a story, When I request tests, Then GWT steps are returned.

**US-AI-003 — INVEST analysis**  
As a user, I want AI INVEST feedback, so that quality improves.  
GWT: Given a story, When I request analysis, Then INVEST output is returned.

**US-AI-004 — SSE streaming responses**  
As a user, I want streaming, so that I see progress in real time.  
GWT: Given request, When streaming enabled, Then partial updates are emitted.

**US-AI-005 — Template enforcement**  
As a system, I want template compliance, so that outputs are consistent.  
GWT: Given template, When AI responds, Then required fields exist.

**US-AI-006 — AI disable switch**  
As a system operator, I want AI disable, so that offline mode works.  
GWT: Given AI disabled, When AI is called, Then response indicates disabled.

**US-AI-007 — Error handling**  
As a user, I want clear AI errors, so that I can retry.  
GWT: Given AI failure, When response returns, Then error is explicit.

**US-AI-008 — Timeout handling**  
As a system, I want AI timeouts handled, so that services remain responsive.  
GWT: Given timeout, When AI call exceeds limit, Then request fails gracefully.

**US-AI-009 — Input validation**  
As a system, I want AI request validation, so that malformed payloads are rejected.  
GWT: Given missing fields, When request sent, Then 400 is returned.

**US-AI-010 — Response attribution**  
As a user, I want AI output flagged, so that I can distinguish generated content.  
GWT: Given AI output, When displayed, Then AI flag is shown.

**US-AI-011 — Rate limit handling**  
As a system, I want rate limits handled, so that failures are clear.  
GWT: Given rate limit, When exceeded, Then error indicates rate limit.

**US-AI-012 — Session pool availability**  
As a system operator, I want session pool health, so that AI requests are routed.  
GWT: Given pool busy, When request sent, Then queueing is applied.

**US-AI-013 — Template versioning**  
As a system, I want template versions, so that changes are traceable.  
GWT: Given template version, When used, Then output references version.

**US-AI-014 — Audit logging**  
As a system operator, I want AI requests logged, so that troubleshooting is possible.  
GWT: Given AI request, When completed, Then log entry is created.

---

## Epic 9 — GitHub Integration (16)

**US-GH-001 — Token status endpoint**  
As an operator, I want a GitHub token status check, so that I can diagnose issues.  
GWT: Given token set, When /api/github-status, Then validity is reported.

**US-GH-002 — Token not exposed**  
As an operator, I want tokens never logged, so that secrets are safe.  
GWT: Given status endpoint, When called, Then token is not returned.

**US-GH-003 — Create PR from story**  
As a developer, I want PR creation from story, so that work is traceable.  
GWT: Given story eligible, When Create PR, Then PR is created.

**US-GH-004 — PR body includes intent**  
As a reviewer, I want PR body to include As/I/So, so that intent is clear.  
GWT: Given PR created, When body generated, Then intent fields are included.

**US-GH-005 — PR includes acceptance criteria**  
As a reviewer, I want GWT criteria in PR body, so that tests align.  
GWT: Given PR created, When body generated, Then acceptance criteria included.

**US-GH-006 — Store PR metadata**  
As a system, I want PR metadata stored, so that UI shows status.  
GWT: Given PR created, When saved, Then URL and status persist.

**US-GH-007 — Link PR to story**  
As a system, I want PR linked to story, so that traceability exists.  
GWT: Given PR created, When stored, Then story references PR.

**US-GH-008 — Merge PR from UI**  
As a maintainer, I want to merge via AIPM, so that workflow is centralized.  
GWT: Given PR ready, When merge requested, Then merge is attempted.

**US-GH-009 — Merge prechecks**  
As a maintainer, I want checks enforced, so that merge is safe.  
GWT: Given failing checks, When merge requested, Then merge is blocked.

**US-GH-010 — PR status refresh**  
As a user, I want PR status refreshed, so that UI is accurate.  
GWT: Given PR exists, When refresh runs, Then latest status is shown.

**US-GH-011 — PR close handling**  
As a user, I want closed PRs reflected, so that status is accurate.  
GWT: Given PR closed, When status refreshed, Then story reflects closed status.

**US-GH-012 — PR list in story detail**  
As a user, I want PR links shown, so that I can navigate to GitHub.  
GWT: Given PR metadata, When viewing story, Then PR link is displayed.

**US-GH-013 — Multiple PR handling**  
As a user, I want multiple PRs tracked, so that rework is traceable.  
GWT: Given multiple PRs, When viewing story, Then all PRs are listed.

**US-GH-014 — PR creation error messaging**  
As a user, I want clear errors, so that I can resolve permission issues.  
GWT: Given PR creation fails, When error occurs, Then message is actionable.

**US-GH-015 — Repository configuration**  
As an operator, I want repo configuration, so that PRs target correct repo.  
GWT: Given config set, When PR created, Then it targets configured repo.

**US-GH-016 — Branch naming convention**  
As a developer, I want consistent branch naming, so that PRs are organized.  
GWT: Given PR created, When branch generated, Then name follows convention.

---

## Epic 10 — CI/CD & Deploy (18)

**US-CI-001 — Gating tests runner**  
As a CI system, I want a standard gating runner, so that quality is enforced.  
GWT: Given a PR, When gating runs, Then phases execute in order.

**US-CI-002 — Phase 1 security checks**  
As a security lead, I want security checks, so that unsafe config fails early.  
GWT: Given missing secrets, When phase 1 runs, Then it fails fast.

**US-CI-003 — Phase 2 data checks**  
As an operator, I want data integrity checks, so that DynamoDB is valid.  
GWT: Given invalid table, When phase 2 runs, Then it fails with guidance.

**US-CI-004 — Phase 3 integration tests**  
As a CI system, I want integration tests, so that APIs are validated.  
GWT: Given backend, When phase 3 runs, Then API checks pass.

**US-CI-005 — Phase 4 UI checks**  
As a CI system, I want UI checks, so that frontend changes are validated.  
GWT: Given UI build, When phase 4 runs, Then UI tests pass.

**US-CI-006 — Test in Dev workflow**  
As a developer, I want “Test in Dev,” so that changes are validated.  
GWT: Given PR, When trigger Test in Dev, Then deploys to dev.

**US-CI-007 — Production deploy on main**  
As a release manager, I want auto-deploy on main, so that releases are consistent.  
GWT: Given merge to main, When pipeline runs, Then prod deploy executes.

**US-CI-008 — Unified deploy script**  
As a DevOps engineer, I want a unified script, so that deploy behavior is consistent.  
GWT: Given env, When script runs, Then correct resources are deployed.

**US-CI-009 — Deployment status feedback**  
As a developer, I want deploy results shown, so that I can confirm status.  
GWT: Given deploy triggered, When completed, Then status is surfaced.

**US-CI-010 — Rollback procedure**  
As an operator, I want rollback steps, so that incidents can be mitigated.  
GWT: Given failure, When rollback executed, Then system returns to healthy state.

**US-CI-011 — Artifact retention**  
As a CI operator, I want logs/artifacts retained, so that debugging is possible.  
GWT: Given a run, When completed, Then logs are stored.

**US-CI-012 — Environment variable checks**  
As a CI system, I want env var validation, so that missing config fails early.  
GWT: Given missing env, When gating runs, Then it fails with message.

**US-CI-013 — Health check post-deploy**  
As a CI system, I want health checks, so that deploy success is verified.  
GWT: Given deploy completes, When health check runs, Then /health is ok.

**US-CI-014 — CI status in RTM**  
As a QA lead, I want CI status in RTM, so that coverage is visible.  
GWT: Given CI run, When RTM loads, Then CI column shows status.

**US-CI-015 — Dev/prod isolation in CI**  
As a DevOps engineer, I want isolation, so that dev tests don’t hit prod data.  
GWT: Given CI run, When executed, Then dev tables are used.

**US-CI-016 — Linting checks**  
As a CI system, I want linting, so that style issues are caught.  
GWT: Given code changes, When lint runs, Then errors are reported.

**US-CI-017 — Dependency audit**  
As a security lead, I want dependency scans, so that vulnerable libs are flagged.  
GWT: Given dependencies, When audit runs, Then vulnerabilities are reported.

**US-CI-018 — Notifications**  
As a developer, I want notifications on failures, so that I can act quickly.  
GWT: Given failed CI, When it completes, Then notification is sent.

---

## Epic 11 — Code Generation (18)

**US-CG-001 — Code generation request**  
As a developer, I want to trigger code generation, so that implementation begins.  
GWT: Given story+PR, When I click Generate Code, Then request is queued.

**US-CG-002 — Queue management**  
As a system operator, I want queued tasks, so that load is managed.  
GWT: Given all sessions busy, When request sent, Then it is queued.

**US-CG-003 — Session allocation**  
As a system operator, I want session allocation, so that tasks are processed.  
GWT: Given an idle session, When a task starts, Then it is assigned.

**US-CG-004 — Standard workflow steps**  
As a tech lead, I want workflow steps enforced, so that output is consistent.  
GWT: Given task runs, When executed, Then checkout→rebase→implement→test→commit→push.

**US-CG-005 — Template compliance**  
As a tech lead, I want code generation to follow template, so that PRs are predictable.  
GWT: Given template, When codegen runs, Then output aligns to template.

**US-CG-006 — Gating tests addition**  
As a QA lead, I want gating tests added, so that requirements are verified.  
GWT: Given story needs tests, When codegen runs, Then gating tests are added.

**US-CG-007 — Stream progress**  
As a user, I want streaming progress, so that I can monitor.  
GWT: Given running task, When SSE enabled, Then progress updates stream.

**US-CG-008 — Task failure handling**  
As a user, I want clear failure status, so that I can retry.  
GWT: Given failure, When task ends, Then status is failed with reason.

**US-CG-009 — Task success handling**  
As a user, I want success status, so that I can proceed to review.  
GWT: Given success, When task ends, Then status is success with commit link.

**US-CG-010 — PR update on completion**  
As a developer, I want PR updated, so that changes are visible.  
GWT: Given codegen success, When completed, Then PR contains new commit.

**US-CG-011 — Logs captured**  
As a developer, I want logs captured, so that debugging is possible.  
GWT: Given task runs, When completed, Then logs are stored.

**US-CG-012 — Task cancellation**  
As a user, I want cancel option, so that I can stop a task.  
GWT: Given running task, When cancel requested, Then task stops.

**US-CG-013 — Task retry**  
As a user, I want retry, so that transient failures can be re-run.  
GWT: Given failed task, When retry requested, Then task restarts.

**US-CG-014 — Story lock during codegen**  
As a user, I want lock indication, so that conflicting edits are avoided.  
GWT: Given running task, When I edit story, Then UI warns about lock.

**US-CG-015 — Readiness checks**  
As a system, I want readiness checks, so that only eligible stories run.  
GWT: Given story not Ready, When codegen requested, Then request is blocked.

**US-CG-016 — Branch validation**  
As a system, I want branch validation, so that changes apply correctly.  
GWT: Given PR branch missing, When codegen starts, Then it fails with message.

**US-CG-017 — Task metadata persisted**  
As a system, I want task metadata persisted, so that audit is possible.  
GWT: Given a task, When queued, Then metadata includes storyId/pr branch.

**US-CG-018 — Post-codegen status update**  
As a system, I want story status updated (optional), so that progress reflects automation.  
GWT: Given codegen success, When completed, Then story status updates if configured.

---

## Epic 12 — Security & Governance (18)

**US-SEC-001 — No secrets in code**  
As a security reviewer, I want no secrets in repo, so that leakage is prevented.  
GWT: Given codebase, When scanned, Then secrets are not present.

**US-SEC-002 — No secrets in logs**  
As a security reviewer, I want secrets masked in logs, so that leakage is prevented.  
GWT: Given logs, When inspected, Then tokens are not present.

**US-SEC-003 — API access policy**  
As a system owner, I want an access policy, so that authorization is explicit.  
GWT: Given policy enabled, When unauthorized request, Then access is denied.

**US-SEC-004 — CORS policy**  
As a system owner, I want CORS rules, so that API exposure is controlled.  
GWT: Given CORS rules, When cross-origin request, Then policy is enforced.

**US-SEC-005 — Rate limiting**  
As a system owner, I want rate limiting, so that abuse is mitigated.  
GWT: Given repeated calls, When limit exceeded, Then 429 is returned.

**US-SEC-006 — Input sanitization**  
As a security reviewer, I want sanitized inputs, so that injection is mitigated.  
GWT: Given malicious input, When submitted, Then it is rejected or sanitized.

**US-SEC-007 — Audit logging**  
As a security reviewer, I want audit logs, so that changes are traceable.  
GWT: Given critical action, When performed, Then audit log entry exists.

**US-SEC-008 — Secrets in env only**  
As a security reviewer, I want secrets only in env, so that they are not committed.  
GWT: Given config, When loaded, Then secrets are read from env only.

**US-SEC-009 — IAM least privilege**  
As a security reviewer, I want IAM least privilege, so that access is minimal.  
GWT: Given IAM role, When reviewed, Then only required permissions exist.

**US-SEC-010 — Token rotation**  
As a security reviewer, I want token rotation support, so that long-lived tokens can be replaced.  
GWT: Given new token, When rotated, Then old token is invalidated.

**US-SEC-011 — HTTPS enforced**  
As a security reviewer, I want HTTPS enforced, so that traffic is secure.  
GWT: Given HTTP request, When received, Then it redirects or is blocked.

**US-SEC-012 — CSRF protection**  
As a security reviewer, I want CSRF protection, so that requests are trusted.  
GWT: Given missing CSRF token, When POST, Then request is rejected.

**US-SEC-013 — Data encryption at rest**  
As a security reviewer, I want DynamoDB encryption, so that data is protected.  
GWT: Given tables, When inspected, Then encryption at rest is enabled.

**US-SEC-014 — PII handling**  
As a security reviewer, I want PII handling guidelines, so that compliance is met.  
GWT: Given PII fields, When stored, Then masking rules apply.

**US-SEC-015 — Session timeout**  
As a security reviewer, I want session timeout, so that inactive users are logged out.  
GWT: Given inactivity, When timeout reached, Then session expires.

**US-SEC-016 — Access logs**  
As a security reviewer, I want access logs, so that requests are traceable.  
GWT: Given API request, When processed, Then request log exists.

**US-SEC-017 — Dependency pinning**  
As a security reviewer, I want dependency pinning, so that supply chain risk is reduced.  
GWT: Given dependencies, When inspected, Then versions are pinned.

**US-SEC-018 — Security documentation**  
As a security reviewer, I want security docs, so that rules are explicit.  
GWT: Given docs, When reviewed, Then policies are documented.

---

## Epic 13 — Observability & Ops (18)

**US-OPS-001 — Structured logging**  
As an operator, I want structured logs, so that troubleshooting is easier.  
GWT: Given requests, When logged, Then logs include action and outcome.

**US-OPS-002 — Correlation IDs**  
As an operator, I want correlation IDs, so that requests can be traced.  
GWT: Given request, When processed, Then correlation ID is logged.

**US-OPS-003 — Metrics exposure**  
As an operator, I want metrics, so that performance is monitored.  
GWT: Given running service, When metrics endpoint called, Then metrics are returned.

**US-OPS-004 — Health check details**  
As an operator, I want dependency status, so that I know what failed.  
GWT: Given dependency down, When /health called, Then response indicates failure.

**US-OPS-005 — Error rate alerts**  
As an operator, I want alerts, so that I can react to spikes.  
GWT: Given error rate threshold, When exceeded, Then alert is triggered.

**US-OPS-006 — Log retention**  
As an operator, I want retention rules, so that logs are managed.  
GWT: Given retention policy, When time passes, Then logs are archived/expired.

**US-OPS-007 — Database health checks**  
As an operator, I want DynamoDB checks, so that table access is verified.  
GWT: Given /health, When called, Then DynamoDB connectivity is checked.

**US-OPS-008 — Config validation at startup**  
As an operator, I want config validation, so that misconfigurations fail fast.  
GWT: Given missing config, When starting, Then service fails with clear error.

**US-OPS-009 — Backup scheduling**  
As an operator, I want backup scheduling, so that recovery is possible.  
GWT: Given schedule, When time triggers, Then backup runs.

**US-OPS-010 — Restore validation**  
As an operator, I want restore steps, so that backups are usable.  
GWT: Given backup, When restore performed, Then data is verified.

**US-OPS-011 — Deployment runbook**  
As an operator, I want a runbook, so that incidents are handled safely.  
GWT: Given incident, When runbook followed, Then rollback succeeds.

**US-OPS-012 — Dev/prod isolation**  
As an operator, I want environment isolation, so that data isn’t mixed.  
GWT: Given STAGE=dev, When running, Then dev tables are used.

**US-OPS-013 — Feature flagging**  
As an operator, I want feature flags, so that changes can be toggled.  
GWT: Given flag off, When feature requested, Then it is disabled.

**US-OPS-014 — Dependency health reporting**  
As an operator, I want dependency statuses, so that I can diagnose issues.  
GWT: Given service health, When checked, Then dependency statuses show.

**US-OPS-015 — Capacity planning guide**  
As an operator, I want capacity guidance, so that scaling is planned.  
GWT: Given docs, When reviewed, Then capacity recommendations exist.

**US-OPS-016 — Routine maintenance checklist**  
As an operator, I want maintenance checklist, so that upkeep is consistent.  
GWT: Given maintenance doc, When followed, Then tasks are completed.

**US-OPS-017 — Disaster recovery plan**  
As an operator, I want DR plan, so that outages are mitigated.  
GWT: Given DR scenario, When executed, Then recovery succeeds.

**US-OPS-018 — Performance diagnostics**  
As an operator, I want performance tools, so that slow paths are identified.  
GWT: Given performance issue, When diagnostics run, Then hotspots are identified.

---

## Epic 14 — Documentation & Training (10)

**US-DOC-001 — Developer onboarding**  
As a new contributor, I want clear setup steps, so that I can start quickly.  
GWT: Given docs, When followed, Then app runs locally.

**US-DOC-002 — API reference completeness**  
As a developer, I want API docs, so that integrations are correct.  
GWT: Given endpoints, When docs reviewed, Then each endpoint is documented.

**US-DOC-003 — UI usage guide**  
As a user, I want UI guide, so that I can use features effectively.  
GWT: Given UI docs, When reviewed, Then RTM/Kanban/Mindmap are described.

**US-DOC-004 — Deployment guide**  
As an operator, I want deployment steps, so that releases are repeatable.  
GWT: Given deploy guide, When followed, Then deploy succeeds.

**US-DOC-005 — Testing guide**  
As a QA lead, I want testing docs, so that gating tests are runnable.  
GWT: Given testing doc, When followed, Then tests run as described.

**US-DOC-006 — Configuration reference**  
As an operator, I want config reference, so that env vars are clear.  
GWT: Given config doc, When reviewed, Then env vars are listed.

**US-DOC-007 — AI services guide**  
As a developer, I want AI setup doc, so that AI features work.  
GWT: Given AI setup doc, When followed, Then AI endpoints are reachable.

**US-DOC-008 — Security policy docs**  
As a security reviewer, I want security rules documented, so that compliance is clear.  
GWT: Given security docs, When reviewed, Then policies are explicit.

**US-DOC-009 — Troubleshooting guide**  
As a user, I want troubleshooting steps, so that issues are resolved faster.  
GWT: Given an error, When I follow steps, Then issue is diagnosable.

**US-DOC-010 — Release notes**  
As a user, I want release notes, so that changes are transparent.  
GWT: Given a release, When notes are published, Then changes are listed.
