#!/bin/bash

echo "=========================================="
echo "HAIR SERVICE DEBUGGING LOGS"
echo "=========================================="
echo ""

echo "=== 1. NGINX ACCESS LOGS (Last 10 requests) ==="
docker logs growup-api-gateway 2>&1 | grep "/api/hair" | tail -10
echo ""

echo "=== 2. MIDDLEWARE LOGS (Last 20 lines) ==="
docker logs growup-api-gateway 2>&1 | grep -E "(📨|🔄|✅|❌|info:|error:)" | tail -20
echo ""

echo "=== 3. HAIR SERVICE LOGS (Last 20 lines) ==="
# Assuming hair service logs go to the terminal where it's running
echo "Check your hair service terminal/output for logs starting with '📨 Hair Service'"
echo ""

echo "=== 4. CIRCUIT BREAKER STATUS ==="
curl -s http://localhost:3000/circuit-breakers 2>/dev/null | jq '.data[] | select(.serviceName == "hair-tryon-service")' 2>/dev/null || echo "Could not fetch circuit breaker status"
echo ""

echo "=========================================="
echo "Run this after trying the mobile app request"
echo "=========================================="
