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
| `aipm.app.sqlite.json` | AI Project Manager scenario with 3 root epics, uniformly sampled 0–5 child branches (max depth seeded at 3 of the allowed 1–7 range), 50 stories, 200 tasks spread across 15 specialists, and 47/50 stories (94/100 acceptance tests) passing evidence-linked quality checks. |
