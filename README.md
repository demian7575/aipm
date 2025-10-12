# AI PM Mindmap (Simplified)

This project provides a lightweight interface for managing user stories with story points, assignees, and reference documents backed by SQLite.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

The command starts the Express backend on port 4000 and serves the static frontend from `apps/frontend/public`.

## Testing

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
    server.js
  frontend/
    public/
      index.html
      styles.css
      app.js
```

The SQLite database is stored at `apps/backend/data/app.sqlite`.
