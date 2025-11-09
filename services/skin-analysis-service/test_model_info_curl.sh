#!/bin/bash
# Test script for /api/v1/model/info endpoint using curl
# This demonstrates how to call the endpoint from the command line

echo "========================================================================"
echo "Testing /api/v1/model/info Endpoint with curl"
echo "========================================================================"
echo ""

# Check if server is running
echo "Checking if server is running on http://localhost:8000..."
if ! curl -s -f http://localhost:8000/ > /dev/null 2>&1; then
    echo "✗ Server is not running on http://localhost:8000"
    echo ""
    echo "To start the server, run:"
    echo "  uvicorn app.main:app --host 0.0.0.0 --port 8000"
    echo ""
    exit 1
fi

echo "✓ Server is running"
echo ""

# Make request to model info endpoint
echo "Making GET request to /api/v1/model/info..."
echo ""

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:8000/api/v1/model/info)

# Extract HTTP status code
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS:/d')

echo "Response Status: $http_status"
echo ""

if [ "$http_status" = "200" ]; then
    echo "✓ Request successful!"
    echo ""
    echo "========================================================================"
    echo "Model Information:"
    echo "========================================================================"
    echo "$body" | python3 -m json.tool
    echo ""
    echo "========================================================================"
    echo "✓ Test completed successfully!"
    echo "========================================================================"
    exit 0
else
    echo "✗ Request failed with status $http_status"
    echo ""
    echo "Response body:"
    echo "$body"
    exit 1
fi
