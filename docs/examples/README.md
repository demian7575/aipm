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
| `aipm.app.sqlite.json` | AI Project Manager scenario with 3 root epics, 50 stories, 200 tasks, and mostly passing acceptance tests designed to exercise dependency and staffing visualizations. |
