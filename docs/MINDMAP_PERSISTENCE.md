# Mindmap Persistence Across Deployments

## Overview

Mindmap layout information (positions, zoom, expanded nodes) is now persisted to DynamoDB, ensuring data survives software upgrades, re-deployments, and can be accessed across different devices.

## Architecture

### Storage Layers

1. **Browser localStorage** (immediate, local-only)
   - Provides instant persistence for UI responsiveness
   - Falls back when backend is unavailable

2. **DynamoDB** (persistent, deployment-safe)
   - Stores mindmap settings in `aipm-{stage}-mindmap-settings` table
   - Survives application upgrades and re-deployments
   - Accessible across devices/browsers

### Data Flow

```
User Action → Frontend State → localStorage (sync) → Backend API (async) → DynamoDB
                                      ↓
                              On Page Load: DynamoDB → Backend API → Frontend (overrides localStorage)
```

## Persisted Data

The following mindmap information is stored:

- **zoom**: Current zoom level (default: 1.0)
- **showDependencies**: Dependency visualization toggle
- **positions**: Manual node positions `{ storyId: { x, y } }`
- **autoLayout**: Auto-layout mode enabled/disabled
- **expanded**: Array of expanded story IDs
- **centerPosition**: Mindmap viewport center coordinates

## API Endpoints

### Save Mindmap Settings
```http
POST /api/mindmap/persist
Content-Type: application/json

{
  "zoom": 1.5,
  "showDependencies": true,
  "positions": { "1": { "x": 100, "y": 200 } },
  "autoLayout": false,
  "expanded": [1, 2, 3]
}
```

**Response:**
```json
{
  "message": "Mindmap state persisted to DynamoDB",
  "positions": 1
}
```

### Restore Mindmap Settings
```http
GET /api/mindmap/restore
```

**Response:**
```json
{
  "zoom": 1.5,
  "showDependencies": true,
  "positions": { "1": { "x": 100, "y": 200 } },
  "autoLayout": false,
  "expanded": [1, 2, 3],
  "updatedAt": "2025-11-30T03:52:36.909Z"
}
```

## DynamoDB Table Schema

**Table Name:** `aipm-{stage}-mindmap-settings`

| Attribute | Type | Description |
|-----------|------|-------------|
| userId (PK) | String | User identifier (default: "default") |
| zoom | Number | Zoom level |
| showDependencies | Boolean | Show dependency lines |
| positions | Map | Node positions by story ID |
| autoLayout | Boolean | Auto-layout enabled |
| expanded | List | Expanded story IDs |
| centerPosition | Map | Viewport center {x, y} |
| updatedAt | String | ISO timestamp of last update |

## Deployment

The mindmap settings table is automatically created during deployment:

```bash
./deploy.sh
```

The deployment script:
1. Creates `MindmapSettingsTable` in DynamoDB
2. Grants Lambda permissions to read/write
3. Sets `MINDMAP_SETTINGS_TABLE` environment variable

## Testing

Run mindmap persistence tests:

```bash
node --test tests/mindmap-persistence.test.js
```

## User Experience

### On First Load
- Uses localStorage if available
- Fetches from backend asynchronously
- Backend data overrides localStorage when available

### During Usage
- Changes save to localStorage immediately (no lag)
- Backend sync happens asynchronously (non-blocking)
- Failures logged to console, don't interrupt workflow

### After Upgrade/Redeployment
- All mindmap positions and settings preserved
- No manual export/import required
- Seamless experience across versions

## Migration from localStorage-only

Existing users with localStorage data will:
1. Continue using localStorage on load
2. Automatically sync to backend on first interaction
3. Benefit from persistent storage going forward

No manual migration required.

## Multi-User Support (Future)

Currently uses a single `userId: "default"`. To support multiple users:

1. Add authentication layer
2. Pass user ID from frontend to backend
3. Update API calls to include user context
4. Each user gets isolated mindmap settings

## Troubleshooting

### Settings not persisting
- Check browser console for API errors
- Verify DynamoDB table exists: `aws dynamodb describe-table --table-name aipm-prod-mindmap-settings`
- Confirm Lambda has DynamoDB permissions

### Settings not restoring after deployment
- Verify `MINDMAP_SETTINGS_TABLE` environment variable is set
- Check Lambda logs: `serverless logs -f api -t`
- Test API directly: `curl https://your-api.com/api/mindmap/restore`

### Conflicting data between devices
- Last write wins (no conflict resolution currently)
- Consider adding timestamp-based merge logic if needed
