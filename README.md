# AI Project Manager Mindmap (Rebuilt)

This repository hosts a fresh implementation of the AI-assisted planning workspace. It renders merge requests, user stories, and acceptance tests as an interactive mindmap and enforces **As a / I want / So that** and **Given / When / Then** drafting with INVEST-style coaching before anything is created.

## Getting started

```bash
npm install
npm run dev
```

The development server runs on <http://localhost:5173>. All state lives in the browser—stop the dev server or close the tab to reset the snapshot.

### Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Launches Vite in development mode. |
| `npm run build` | Type-checks and builds the production bundle. |
| `npm run preview` | Serves the production build locally. |
| `npm run test` | Executes the Vitest + Testing Library smoke test. |

## Core experience

- **Merge Request list** – Create new MRs and pick one to visualise. The assistant checks title and summary clarity before the create button is enabled.
- **User Story drafting** – Every story follows *As a / I want / So that*. The guidance panel reviews INVEST principles (independent, negotiable, valuable, estimable, small, testable) and blocks creation on structural failures.
- **Acceptance Test drafting** – Test cases are recorded in *Given / When / Then* order. The guidance step highlights vague language, placeholders, and missing prefixes before allowing the test to be attached.
- **Interactive mindmap** – The currently selected MR renders as a draggable radial mindmap. Nodes can be repositioned to suit workshops while acceptance tests animate as dashed edges to emphasise verification paths.
- **Detail workspace** – Inspect the selected story, attach child stories, and manage its acceptance tests from the right-hand panel.

## Persistence note

This rebuild intentionally keeps everything client-side. The moment the browser tab or local Node server stops, the state returns to the seeded snapshot. Hook the UI into your own API if you need persistence beyond a facilitation session.
