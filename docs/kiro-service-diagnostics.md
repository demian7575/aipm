# Kiro Terminal / Persistent Session Troubleshooting

The Kiro persistent session server (port `8084`) has been failing because the EC2 host lacks the helper script, logs are corrupt, and multiple terminal servers are competing for the same ports. Use the checklist below to stabilize the service.

## Quick health check
Run from the EC2 host:

```bash
# Optional: point to a different checkout or port
# export KIRO_APP_DIR=/home/ec2-user/aipm
# export KIRO_PORT=8084
scripts/utilities/kiro-service-health.sh
```

The script verifies:
- **Problem 1** – missing `/home/ec2-user/aipm/scripts/kiro-persistent-session.js`
- **Problem 2** – log corruption in `/tmp/kiro-worker-pool.log` and `/tmp/pr-processor.log`
- **Problem 3** – competing listeners on terminal ports (8080–8085)
- **Problem 4** – lack of process supervision (recommendation block at end)

## Stabilization steps
1. **Restore the codebase**: ensure `/home/ec2-user/aipm` exists and contains `scripts/kiro-persistent-session.js`. Re-clone or sync if missing.
2. **Stop duplicate servers**: terminate stray Node/Express terminal servers that listen on 8080–8085. Keep only the intended one for the persistent session endpoint.
3. **Clean corrupted logs**: after stopping services, truncate or rotate `/tmp/kiro-worker-pool.log` and `/tmp/pr-processor.log` to remove NUL bytes that crash parsers.
4. **Add supervision**: create a `systemd` unit (e.g., `kiro-persistent-session.service`) with `Restart=on-failure` and an `ExecStopPost` hook to clean temp artifacts. This prevents port conflicts and orphaned sockets.

## Example systemd unit (template)
Save as `/etc/systemd/system/kiro-persistent-session.service` and adjust paths as needed:

```ini
[Unit]
Description=Kiro Persistent Session Server
After=network.target

[Service]
WorkingDirectory=/home/ec2-user/aipm
ExecStart=/usr/bin/node scripts/kiro-persistent-session.js --interval 60
Restart=on-failure
RestartSec=5
Environment=KIRO_PORT=8084
Environment=KIRO_APP_DIR=/home/ec2-user/aipm
ExecStopPost=/usr/bin/sh -c 'truncate -s 0 /tmp/kiro-worker-pool.log /tmp/pr-processor.log || true'

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable kiro-persistent-session.service
sudo systemctl start kiro-persistent-session.service
sudo systemctl status kiro-persistent-session.service
```

## Step-by-step trace logging
- **Health script trace**: run `TRACE=1 scripts/utilities/kiro-service-health.sh --trace` to see numbered steps (runtime check, script presence, port scan, log scan, process conflicts, supervision hints) and the exact commands executed for port and log inspection.
- **Heartbeat trace**: run `node scripts/kiro-persistent-session.js --once --trace` (optionally add `--url`/`--interval`/`--story` flags) to capture the payload construction, dispatch timestamp, roundtrip timing, and raw response length. Use `--dry-run` to print the payload without network traffic.

## Signal and process flows
**Persistent session heartbeat (port 8084)**
1. `kiro-persistent-session.js` builds a `ping` payload with optional `storyId/context` and posts to `http://<host>:8084/kiro/chat`.
2. The persistent-session server proxies the payload to the EC2-side Kiro CLI worker pool.
3. The worker pool writes activity and PTY output to `/tmp/kiro-worker-pool.log`, then returns the CLI response to the heartbeat caller.
4. The health script (`kiro-service-health.sh`) checks for missing scripts, verifies port 8084 is singularly owned, and inspects the log files for corruption.
5. `systemd` (recommended) restarts the persistent-session unit on failure and truncates logs via `ExecStopPost`.

**In-app Kiro terminal/WebSocket**
1. The AIPM frontend opens a WebSocket to the terminal service; user keystrokes and branch/story context are sent as binary-safe frames.
2. The terminal controller forwards the frames to the EC2 PTY service; responses stream back as binary buffers.
3. PTY output is decoded in the browser and rendered in the Kiro terminal modal and standalone view.
4. Health scripts detect competing terminal servers on ports 8080–8085 and highlight any conflicts or missing binaries that could block this stream.

## Log inspection
If the health script reports NUL bytes or repeated crashes, rotate the logs:

```bash
sudo systemctl stop kiro-persistent-session.service
sudo truncate -s 0 /tmp/kiro-worker-pool.log /tmp/pr-processor.log
sudo systemctl start kiro-persistent-session.service
```

Re-run `scripts/utilities/kiro-service-health.sh` to confirm the service is clean and listening only once on port 8084.
