# Example datasets

Use the generator script to create demonstration SQLite databases for manual testing.

```bash
npm run generate:sample-db -- docs/examples/app-50-stories.sqlite
```

The command above produces a file containing 50 hierarchical user stories and draft acceptance tests. Generated files are git-ignored, so copy the output to `apps/backend/data/app.sqlite` when you want to boot the app with the sample data.

## Curated snapshots

Two example datasets are committed for quick reference:

| File | Notes |
| ---- | ----- |
| `app.sqlite.json` | Authentication-focused backlog used by regression tests for the JSON fallback driver. |
| `aipm.app.sqlite.json` | AI Project Manager scenario with 3 root epics, a topology planner that enforces 0–5 children per story while guaranteeing two or three leaves at depth 7 (and never exceeding depth 7), an average story depth of exactly 3 across the 50 stories, 200 tasks spread across 15 specialists, aggregated story points that always exceed the sum of direct children, and all 50 stories (100/100 acceptance tests) passing evidence-linked quality checks. |
| `codex-delegation-sample.json` | Example payload showing the response from `/api/stories/:id/codex/delegate`, including the two tasks that are created automatically when the built-in workflow queues work with ChatGPT Codex. |
