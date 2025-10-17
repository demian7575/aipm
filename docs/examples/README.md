# Example datasets

Use the generator script to create demonstration SQLite databases for manual testing.

```bash
npm run generate:sample-db -- docs/examples/app-50-stories.sqlite
```

The command above produces a file containing 50 hierarchical user stories and draft acceptance tests. Generated files are git-ignored, so copy the output to `apps/backend/data/app.sqlite` when you want to boot the app with the sample data.
