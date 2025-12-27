#!/bin/bash

# Kiro CLI Health Monitor
# Checks Kiro CLI health and restarts if needed

API_URL="http://44.220.45.57:8081"
LOG_FILE="/tmp/kiro-health-monitor.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

check_health() {
    local response=$(curl -s "$API_URL/health" 2>/dev/null)
    if [ $? -ne 0 ]; then
        log "❌ Failed to connect to Kiro API server"
        return 1
    fi
    
    local healthy=$(echo "$response" | jq -r '.kiroHealthy // false')
    local time_since=$(echo "$response" | jq -r '.timeSinceLastResponse // "unknown"')
    
    if [ "$healthy" = "true" ]; then
        log "✅ Kiro CLI healthy (last response: $time_since ago)"
        return 0
    else
        log "⚠️ Kiro CLI unhealthy (last response: $time_since ago)"
        return 1
    fi
}

restart_service() {
    log "🔄 Restarting Kiro API service..."
    sudo systemctl restart kiro-api-v4
    sleep 10
    
    if sudo systemctl is-active --quiet kiro-api-v4; then
        log "✅ Service restarted successfully"
        return 0
    else
        log "❌ Service restart failed"
        return 1
    fi
}

main() {
    log "🔍 Checking Kiro CLI health..."
    
    if ! check_health; then
        log "⚠️ Kiro CLI appears unhealthy, attempting restart..."
        if restart_service; then
            sleep 5
            if check_health; then
                log "✅ Health check passed after restart"
            else
                log "❌ Health check still failing after restart"
                exit 1
            fi
        else
            log "❌ Failed to restart service"
            exit 1
        fi
    fi
    
    log "✅ Kiro CLI health check completed"
}

main "$@"
