---
inclusion: always
---

# Project Status & Progress

**Last Updated**: 2026-02-15 16:50 KST

## Recent Changes (Today)
- Fixed Kiro CLI PTY issue - spawn bash then run kiro inside it (not direct spawn)
- Kiro now responds properly via PTY using `\r` instead of `\n`
- All Phase 2 E2E tests passing (10/10 steps)
- Added EC2 auto-stop after 30 minutes of inactivity
- Added EC2 auto-start in gating tests and GitHub workflows
- Frontend now waits for API health check before loading (not just EC2 running)
- Created helper scripts: `./bin/ssh-ec2` and `./bin/ec2-logs`
- Cleaned up outdated services and scripts
- Improved timeout handling - kills and restarts Kiro on 5min timeout

## Current Status
- ✅ Kiro wrappers stable and working correctly
- ✅ Phase 2 E2E workflow fully functional (10/10 steps passing)
- ✅ Session pool healthy (2 wrappers available)
- ✅ All services operational
- ✅ EC2 auto-stop/start implemented

## Active Services
- ✅ Backend API (port 4000) - healthy
- ✅ Semantic API (port 8083) - healthy
- ✅ Kiro Session Pool HTTP (port 8082) - 2 sessions, quick restart on completion
- ✅ Kiro Wrapper @1 (port 9001) - bash → kiro-cli
- ✅ Kiro Wrapper @2 (port 9002) - bash → kiro-cli

## Architecture
```
Frontend (S3) → Backend API (4000) → Semantic API (8083)
                                          ↓
                                   Session Pool (8082)
                                          ↓
                        ┌─────────────────┴─────────────────┐
                        ↓                                   ↓
                 Wrapper 1 (9001)                    Wrapper 2 (9002)
                        ↓                                   ↓
                    bash → kiro-cli                    bash → kiro-cli
```

## Key Fixes Applied
- **PTY Issue**: Changed from spawning kiro-cli directly to spawning bash then running kiro inside it
- **Input Method**: Use `\r` (carriage return) instead of `\n` for terminal input
- **Timeout Handling**: Kill and restart Kiro process on 5-minute timeout
- **EC2 Auto-Stop**: Cron job monitors idle time, stops after 30 minutes
- **EC2 Auto-Start**: Gating tests and workflows check/start EC2 before running
- **Frontend Wait**: Polls `/health` endpoint until API responds (not just EC2 state)

## Helper Scripts
```bash
# SSH to EC2 (auto-detects current IP)
./bin/ssh-ec2 prod
./bin/ssh-ec2 dev

# View live logs
./bin/ec2-logs prod wrapper   # Kiro wrapper logs
./bin/ec2-logs prod backend    # Backend API logs
./bin/ec2-logs prod semantic   # Semantic API logs
./bin/ec2-logs prod pool       # Session pool logs
./bin/ec2-logs prod all        # All services
```

## Known Issues
- None currently

## Next Steps
- Monitor EC2 auto-stop/start in production
- Consider implementing Lambda auto-start proxy (optional)
- Continue feature development

## Architecture Status
- Dual EC2 setup (prod: 100.48.102.121, dev: 44.222.168.46)
- DynamoDB for data storage
- S3 for static hosting
- GitHub Actions for CI/CD with EC2 auto-start
- All services healthy and operational
