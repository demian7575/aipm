# Mindmap Persistence Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Frontend)                       │
│                                                                   │
│  ┌──────────────┐         ┌─────────────────┐                  │
│  │  User Action │────────▶│  State Update   │                  │
│  │ (drag, zoom) │         │  (in-memory)    │                  │
│  └──────────────┘         └────────┬────────┘                  │
│                                     │                            │
│                          ┌──────────▼──────────┐                │
│                          │  Dual Persistence   │                │
│                          └──────────┬──────────┘                │
│                                     │                            │
│                    ┌────────────────┴────────────────┐          │
│                    │                                  │          │
│           ┌────────▼────────┐              ┌─────────▼────────┐ │
│           │  localStorage   │              │  Backend API     │ │
│           │  (immediate)    │              │  (async)         │ │
│           └─────────────────┘              └─────────┬────────┘ │
│                    │                                  │          │
└────────────────────┼──────────────────────────────────┼──────────┘
                     │                                  │
                     │                                  │
                     │         ┌────────────────────────▼──────┐
                     │         │   Lambda Function (Node.js)   │
                     │         │                                │
                     │         │  ┌──────────────────────────┐ │
                     │         │  │  DynamoDB Data Layer     │ │
                     │         │  │  - getMindmapSettings()  │ │
                     │         │  │  - saveMindmapSettings() │ │
                     │         │  └────────────┬─────────────┘ │
                     │         └───────────────┼───────────────┘
                     │                         │
                     │                         │
                     │         ┌───────────────▼───────────────┐
                     │         │  DynamoDB Table               │
                     │         │  aipm-prod-mindmap-settings   │
                     │         │                                │
                     │         │  PK: userId (String)          │
                     │         │  Attributes:                  │
                     │         │    - zoom                     │
                     │         │    - positions                │
                     │         │    - autoLayout               │
                     │         │    - expanded                 │
                     │         │    - updatedAt                │
                     │         └───────────────────────────────┘
                     │                         │
                     │                         │
                     └─────────────────────────┘
                        Survives deployments,
                        upgrades, and browser clears
```

## Data Flow Sequence

### Save Operation
```
1. User drags node
   ↓
2. Frontend updates state.manualPositions
   ↓
3. persistMindmap() called
   ↓
4. [SYNC] Save to localStorage (instant)
   ↓
5. [ASYNC] POST /api/mindmap/persist
   ↓
6. Lambda receives request
   ↓
7. DynamoDB PutItem operation
   ↓
8. Success response (logged, non-blocking)
```

### Restore Operation
```
1. Page loads
   ↓
2. loadPreferences() called
   ↓
3. [SYNC] Read from localStorage (instant UI)
   ↓
4. [ASYNC] GET /api/mindmap/restore
   ↓
5. Lambda queries DynamoDB
   ↓
6. Return settings to frontend
   ↓
7. Override localStorage with backend data
   ↓
8. renderAll() updates UI
```

## Deployment Safety

### Before Implementation
```
┌──────────────┐
│  localStorage│  ← Lost on browser clear
└──────────────┘
       ↓
   ❌ Lost on software upgrade
   ❌ Lost on re-deployment
   ❌ Not accessible from other devices
```

### After Implementation
```
┌──────────────┐     ┌──────────────┐
│  localStorage│ ←→  │   DynamoDB   │
└──────────────┘     └──────────────┘
       ↓                     ↓
   ❌ Temporary          ✅ Persistent
   ❌ Local only         ✅ Cross-device
   ❌ Upgrade-unsafe     ✅ Upgrade-safe
                         ✅ Deployment-safe
```

## Failure Modes & Resilience

| Scenario | Behavior | Data Loss? |
|----------|----------|------------|
| Backend API down | Uses localStorage only | No (local cache) |
| DynamoDB unavailable | Uses localStorage only | No (local cache) |
| Browser cache cleared | Restores from DynamoDB | No (backend has it) |
| Software upgrade | Restores from DynamoDB | No (persisted) |
| Re-deployment | Restores from DynamoDB | No (persisted) |
| Network timeout | localStorage persists | No (retry on next action) |
| Concurrent edits | Last write wins | Possible (no locking) |

## Performance Characteristics

- **Save latency**: <10ms (localStorage) + background sync
- **Restore latency**: <10ms (localStorage) + ~200ms (DynamoDB override)
- **Storage cost**: ~$0.25/month per million requests (DynamoDB on-demand)
- **Network overhead**: ~1KB per save operation

## Security Considerations

- No authentication currently (uses `userId: "default"`)
- Data stored in AWS account (not public)
- Lambda IAM role restricts access to specific table
- HTTPS encryption in transit
- DynamoDB encryption at rest (AWS managed)

## Scalability

- **Single user**: Fully supported
- **Multiple users**: Requires authentication layer
- **High frequency updates**: DynamoDB auto-scales
- **Large mindmaps**: No practical limit (JSON serialization)

## Monitoring

Key metrics to track:
- DynamoDB read/write capacity units
- Lambda invocation count for `/api/mindmap/*`
- API Gateway 4xx/5xx errors
- Frontend console errors for persistence failures

CloudWatch Logs:
```bash
# View Lambda logs
serverless logs -f api -t

# Check DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=aipm-prod-mindmap-settings \
  --start-time 2025-11-29T00:00:00Z \
  --end-time 2025-11-30T00:00:00Z \
  --period 3600 \
  --statistics Sum
```
