#!/bin/bash
if curl -s http://44.220.45.57:8081/health | grep -q "running"; then
    echo "✅ Test passes"
else
    echo "❌ Test failed"
    exit 1
fi
