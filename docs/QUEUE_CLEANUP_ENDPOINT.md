# Queue Cleanup Endpoint

## Overview
Added a new endpoint to clean up the existing Kiro API queue, clearing all pending requests and callbacks.

## Endpoint
```
POST /kiro/v3/queue/cleanup
```

## Response
```json
{
  "success": true,
  "message": "Queue cleanup completed",
  "cleared": {
    "queuedItems": 3,
    "pendingCallbacks": 2,
    "wasProcessing": true
  },
  "timestamp": "2025-12-21T03:15:09.397Z"
}
```

## Usage
```bash
curl -X POST http://44.220.45.57:8081/kiro/v3/queue/cleanup \
  -H "Content-Type: application/json"
```

## What it does
1. Clears all items from the internal queue
2. Cancels all pending callback promises
3. Resets processing state
4. Returns count of cleared items

## When to use
- When requests are stuck or timing out
- To clear a backlog of failed requests
- During debugging or maintenance
- Before restarting the Kiro API server

## Timeout Behavior
The timeout calculation now correctly starts from when a job begins execution (when picked up from queue), not when added to the queue. This means:

- Queue wait time doesn't count against timeout
- Only actual processing time is measured
- Jobs get the full 15-minute timeout once they start executing
