#!/bin/bash

API_BASE="https://wk6h5fkqk9.execute-api.us-east-1.amazonaws.com/prod"
BACKUP_FILE="aipm-backup-$(date +%Y%m%d_%H%M%S).json"

case "$1" in
  "backup")
    echo "🔄 Backing up AIPM data..."
    curl -s "$API_BASE/api/export" > "$BACKUP_FILE"
    if [ $? -eq 0 ]; then
      echo "✅ Backup saved to: $BACKUP_FILE"
      ls -la "$BACKUP_FILE"
    else
      echo "❌ Backup failed"
      exit 1
    fi
    ;;
    
  "restore")
    if [ -z "$2" ]; then
      echo "Usage: $0 restore <backup-file.json>"
      echo "Available backups:"
      ls -la aipm-backup-*.json 2>/dev/null || echo "No backup files found"
      exit 1
    fi
    
    if [ ! -f "$2" ]; then
      echo "❌ Backup file not found: $2"
      exit 1
    fi
    
    echo "🔄 Restoring AIPM data from: $2"
    curl -s -X POST "$API_BASE/api/import" \
      -H "Content-Type: application/json" \
      -d @"$2"
    
    if [ $? -eq 0 ]; then
      echo ""
      echo "✅ Data restored successfully!"
      echo "🌐 Open AIPM: http://aipm-static-hosting-demo.s3-website-us-east-1.amazonaws.com/"
    else
      echo "❌ Restore failed"
      exit 1
    fi
    ;;
    
  *)
    echo "AIPM Backup/Restore Tool"
    echo ""
    echo "Usage:"
    echo "  $0 backup                    # Create backup"
    echo "  $0 restore <backup-file>     # Restore from backup"
    echo ""
    echo "Examples:"
    echo "  $0 backup"
    echo "  $0 restore aipm-backup-20251118_120000.json"
    ;;
esac
