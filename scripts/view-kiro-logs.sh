#!/bin/bash

# View clean Kiro API logs

case "$1" in
  live|tail|-f)
    echo "📡 Watching Kiro API logs (Ctrl+C to stop)..."
    ssh ec2-user@44.220.45.57 'sudo journalctl -u kiro-api-v3 -f' | grep --line-buffered -E "\[2025-.*\]"
    ;;
  clean)
    echo "=== Clean Kiro API Logs ==="
    ssh ec2-user@44.220.45.57 'sudo journalctl -u kiro-api-v3 -n 100 --no-pager' | grep -E "\[2025-.*\]"
    ;;
  errors)
    echo "=== Kiro API Errors ==="
    ssh ec2-user@44.220.45.57 'sudo journalctl -u kiro-api-v3 -n 200 --no-pager' | grep -E "❌"
    ;;
  success)
    echo "=== Successful Requests ==="
    ssh ec2-user@44.220.45.57 'sudo journalctl -u kiro-api-v3 -n 100 --no-pager' | grep -E "✅"
    ;;
  *)
    echo "Usage: $0 {live|clean|errors|success}"
    echo ""
    echo "Commands:"
    echo "  live     - Watch logs in real-time"
    echo "  clean    - Show last 100 clean log entries"
    echo "  errors   - Show only errors"
    echo "  success  - Show only successful requests"
    ;;
esac
