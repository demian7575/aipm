---
inclusion: always
---

# Project Structure

```
apps/
  backend/
    app.js           # Express API + INVEST validation
    dynamodb.js      # DynamoDB data layer
    server.js        # Entry point
  frontend/public/
    app.js           # UI logic (mindmap/outline/details)
    index.html
    styles.css

config/
  environments.yaml  # SINGLE SOURCE OF TRUTH (IPs/ports/tables)
  
scripts/
  semantic-api-server-v2.js  # AI API (port 8083)
  kiro-session-pool.js       # Kiro manager (port 8082)
  testing/                   # Gating tests
  utilities/                 # Deployment helpers

templates/
  POST-aipm-*.md    # AI prompt templates

docs/
  RULES.md          # Project rules + lessons learned
```

## Key Paths

- **Config**: `config/environments.yaml` (never hardcode)
- **Backend API**: `apps/backend/app.js`
- **Frontend**: `apps/frontend/public/app.js`
- **AI Templates**: `templates/POST-aipm-*.md`
- **Tests**: `scripts/testing/phase*.sh`
