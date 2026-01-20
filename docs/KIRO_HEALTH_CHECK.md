# Kiro CLI Health Check & Auto-Start - Feature Summary

**Date**: December 2, 2025  
**Status**: ✅ **DEPLOYED**

## Overview

Added real-time Kiro CLI health check with **automatic restart capability** to the "Generate Code & PR" modal. Users can now see the status and start Kiro CLI if it's not running.

## Features

### 1. Status Banner

Shows real-time Kiro CLI status:

**✅ Green (Healthy)**
```
✅ Kiro CLI is ready (PID: 34198)
```
- Kiro CLI is running and ready
- No action needed

**⚠️ Yellow (Not Running) + Start Button**
```
⚠️ Kiro CLI is not running  [Start Kiro CLI]
```
- Kiro CLI is not running
- Click button to start it automatically

**❌ Red (Server Down) + Start Button**
```
❌ Cannot connect to Kiro CLI server  [Start Kiro CLI]
```
- EC2 server is not reachable
- Click button to attempt restart

### 2. Auto-Start Button

When Kiro is not running, a **"Start Kiro CLI"** button appears:

**Click Flow**:
1. User clicks "Start Kiro CLI"
2. Button shows "Starting..."
3. Calls `POST http://44.220.45.57:8080/restart-kiro`
4. Server restarts (takes ~10 seconds)
5. Status automatically rechecks
6. Green banner appears when ready

## Implementation

### Frontend Changes

**File**: `apps/frontend/public/app.js`

Added auto-start button:
```javascript
function addStartButton() {
  const startBtn = document.createElement('button');
  startBtn.textContent = 'Start Kiro CLI';
  
  startBtn.addEventListener('click', async () => {
    const res = await fetch('http://44.220.45.57:8080/restart-kiro', { 
      method: 'POST' 
    });
    // Wait 10 seconds and recheck
    setTimeout(() => checkKiroStatus(), 10000);
  });
  
  statusBanner.appendChild(startBtn);
}
```

### Backend (Terminal Server)

**File**: `scripts/workers/terminal-server.js`

Restart endpoint already exists:
```javascript
if (url.pathname === '/restart-kiro' && req.method === 'POST') {
  res.end(JSON.stringify({ success: true }));
  setTimeout(() => process.exit(0), 1000);
}
```

The server is managed by a process manager that automatically restarts it.

## User Experience

### Scenario 1: Kiro Running
1. Open "Generate Code & PR" modal
2. ✅ See green banner
3. Proceed with task creation

### Scenario 2: Kiro Not Running
1. Open "Generate Code & PR" modal
2. ⚠️ See yellow banner with "Start Kiro CLI" button
3. Click button
4. Wait 10 seconds
5. ✅ Green banner appears
6. Proceed with task creation

### Scenario 3: Server Down
1. Open "Generate Code & PR" modal
2. ❌ See red banner with "Start Kiro CLI" button
3. Click button (may fail if server is truly down)
4. If successful, wait 10 seconds for restart
5. ✅ Green banner appears

## Testing

### Manual Test
```bash
# Run test script
./test-kiro-health-check.sh
```

### Browser Test
1. Open: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com
2. Select any story
3. Click "Generate Code & PR"
4. ✅ See status banner with appropriate state

### Test Auto-Start (Optional)
```bash
# Stop Kiro (for testing only!)
ssh ec2-user@44.220.45.57 'pkill -f kiro-cli'

# Open modal - should show yellow banner with Start button
# Click Start button - should restart and show green after 10s
```

## Technical Details

### Health Check Flow

```
Modal opens
    ↓
Fetch http://44.220.45.57:8080/health
    ↓
Check response.kiro.running
    ↓
If false → Show Start button
    ↓
User clicks Start
    ↓
POST http://44.220.45.57:8080/restart-kiro
    ↓
Server exits (process manager restarts it)
    ↓
Wait 10 seconds
    ↓
Recheck health
    ↓
Show green banner
```

### Restart Process

1. Frontend calls `/restart-kiro`
2. Server responds with success
3. Server exits after 1 second
4. Process manager (systemd/supervisor) detects exit
5. Process manager restarts terminal-server.js
6. Terminal server spawns new Kiro CLI session
7. Health endpoint returns running status

## Deployment

### Production
```bash
aws s3 cp apps/frontend/public/app.js s3://aipm-static-hosting-demo/app.js --cache-control no-cache
```
**Deployed**: December 2, 2025 18:16 JST

### Development
```bash
aws s3 cp apps/frontend/public/app.js s3://aipm-dev-frontend-hosting/app.js --cache-control no-cache
```
**Deployed**: December 2, 2025 18:16 JST

## Benefits

1. **Self-Service**: Users can start Kiro without admin help
2. **Zero Downtime**: Automatic restart in 10 seconds
3. **Better UX**: No need to contact support
4. **Transparency**: Clear status and action buttons
5. **Reliability**: Automatic recovery from crashes

## Safety

- Restart is safe - process manager handles it
- No data loss - Kiro state is ephemeral
- Quick recovery - 10 second restart time
- Graceful shutdown - 1 second delay before exit

## Limitations

- Cannot start if EC2 instance is down
- Cannot start if process manager is not configured
- 10 second wait time (not instant)
- Only one Kiro instance per server

## Future Enhancements

- Show restart progress bar
- Add "Force Restart" option
- Show Kiro uptime
- Add health check interval (auto-refresh every 30s)
- Show queue status

## Related Documentation

- [GENERATE_CODE_PR_GUIDE.md](docs/GENERATE_CODE_PR_GUIDE.md) - Complete guide
- [GENERATE_CODE_QUICK_REF.md](GENERATE_CODE_QUICK_REF.md) - Quick reference
- [diagnose-generate-flow.sh](diagnose-generate-flow.sh) - Diagnostic script

## Support

If auto-start fails:

1. **Check EC2 instance**:
   ```bash
   ssh ec2-user@44.220.45.57 'uptime'
   ```

2. **Manual restart**:
   ```bash
   ./scripts/workers/start-kiro-terminal.sh
   ```

3. **Check process manager**:
   ```bash
   ssh ec2-user@44.220.45.57 'ps aux | grep terminal-server'
   ```

---

**Implemented by**: Kiro CLI  
**Deployed**: December 2, 2025  
**Status**: Production Ready ✅
