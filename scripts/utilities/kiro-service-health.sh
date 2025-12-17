#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${KIRO_APP_DIR:-/home/ec2-user/aipm}"
SCRIPT_PATH="$APP_DIR/scripts/kiro-persistent-session.js"
PORT="${KIRO_PORT:-8084}"
LOG_FILES=("/tmp/kiro-worker-pool.log" "/tmp/pr-processor.log")
TRACE=${TRACE:-0}

if [[ "${1:-}" == "--trace" ]]; then
  TRACE=1
  shift
fi

step_counter=0

step() {
  step_counter=$((step_counter + 1))
  echo "[STEP ${step_counter}] $*"
}

info() { echo "[INFO] $*"; }
warn() { echo "[WARN] $*"; }
trace() { if [[ "$TRACE" == "1" ]]; then echo "[TRACE] $*"; fi }

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

check_node() {
  step "Detect Node.js runtime"
  if command_exists node; then
    info "Node detected: $(node -v)"
  else
    warn "Node is not installed or not on PATH. Install Node 18+ before starting services."
  fi
}

check_script() {
  step "Verify persistent session helper"
  trace "Looking for script at $SCRIPT_PATH"
  if [[ -f "$SCRIPT_PATH" ]]; then
    info "Persistent session script present at $SCRIPT_PATH"
  else
    warn "Persistent session script missing at $SCRIPT_PATH (Problem 1). Deploy repo or sync scripts before starting the service." 
  fi
}

check_ports() {
  step "Inspect listening ports"
  info "Checking for listeners on port $PORT and nearby terminals (8080-8085)…"
  if command_exists ss; then
    trace "Running: ss -ltnp | awk 'NR==1 || /:808[0-5]/ {print}'"
    ss -ltnp | awk 'NR==1 || /:808[0-5]/ {print}' || true
  elif command_exists lsof; then
    trace "Running: lsof -iTCP:8080-8085 -sTCP:LISTEN"
    lsof -iTCP:8080-8085 -sTCP:LISTEN || true
  else
    warn "Neither ss nor lsof available to inspect ports."
  fi
}

check_logs() {
  step "Scan log files"
  for file in "${LOG_FILES[@]}"; do
    if [[ -f "$file" ]]; then
      size=$(du -h "$file" | cut -f1)
      trace "Tail and NUL scan for $file"
      info "Log $file (size $size) tail:"; tail -n 20 "$file" || true
      if LC_ALL=C grep -q $'\0' "$file"; then
        warn "Log $file contains NUL bytes — likely corruption from crashes (Problem 2). Consider rotating/clearing it after stopping services."
      fi
    else
      warn "Log $file not found; the corresponding service may not be running."
    fi
  done
}

check_processes() {
  step "Check for conflicting Node processes"
  info "Scanning for Kiro-related Node processes to spot conflicts (Problem 3)…"
  ps -eo pid,cmd | grep -Ei 'node .*kiro|kiro-.*terminal' | grep -v grep || true
}

suggest_management() {
  step "Service supervision guidance"
  cat <<'MSG'
[HINT] Service management (Problem 4):
 - Use a single systemd unit (e.g., kiro-persistent-session.service) to start the server and heartbeat with Restart=on-failure.
 - Configure ExecStart to run the intended terminal server only once to avoid port conflicts.
 - Add an ExecStopPost hook to clean temp files and truncate logs safely.
MSG
}

if [[ "$TRACE" == "1" ]]; then
  info "Trace logging enabled (--trace)"
else
  info "Trace logging disabled (set TRACE=1 or pass --trace to enable)"
fi
info "AIPM/Kiro service diagnostics starting…"
check_node
check_script
check_ports
check_logs
check_processes
suggest_management

info "Diagnostics complete."
