# AI PM Mindmap (Simplified)

This project provides a lightweight interface for managing user stories with story points, assignees, acceptance tests, and reference documents backed by SQLite.

## Requirements

- Node.js 22 or newer (for the built-in `node:sqlite` module)

## Setup

There are no third-party dependencies, but running `npm install` will generate a lockfile for tooling consistency.

```bash
npm install
```

## Development

Start the backend (which also serves the static frontend assets) with:

```bash
npm run dev
```

The server listens on port `4000` by default and falls back to the next available port if that port is already in use.

## Building

Create a distributable copy of the backend and frontend assets in `dist/`:

```bash
npm run build
```

## Testing

Execute the Node.js test suite, which exercises the HTTP API and SQLite persistence:

```bash
npm test
```

## Features

- Create and update user stories with story points and assignee email addresses.
- Launch an email composition window for the selected assignee via `mailto:`.
- Manage reference documents for each story through a modal dialog.
- View acceptance tests associated with each story.

## Project Structure

```
apps/
  backend/
    app.js
    server.js
  frontend/
    public/
      index.html
      styles.css
      app.js
scripts/
  build.js
```

The SQLite database is stored at `apps/backend/data/app.sqlite`.
