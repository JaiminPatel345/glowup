#!/bin/bash

# GrowUp Integration Test Runner
# This script runs all integration tests including E2E and load tests

set -e

# Configuration
TEST_ENV=${TEST_ENV:-"test"}
SKIP_SETUP=${SKIP_SETUP:-"false"}
RUN_LOAD_TESTS=${RUN_LOAD_TESTS:-"true"}
LOAD_TEST_CONNECTIONS=${LOAD_TEST_CONNECTIONS:-"5"}
LOAD_TEST_DURATION=${LOAD_TEST_DURATION:-"30"}

echo "🧪 GrowUp Integration Test Suite"
echo "================================"
echo "Environment: $TEST_ENV"
echo "Skip Setup: $SKIP_SETUP"
echo "Run Load Tests: $RUN_LOAD_TESTS"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

# Function to check if service is ready
wait_for_service() {
  local service_name=$1
  local service_url=$2
  local max_attempts=30
  local attempt=1

  print_status $YELLOW "⏳ Waiting for $service_name to be ready..."
  
  while [ $attempt -le $max_attempts ]; do
    if curl -s -f "$service_url/health" > /dev/null 2>&1; then
      print_status $GREEN "✅ $service_name is ready"
      return 0
    fi
    
    echo "   Attempt $attempt/$max_attempts..."
    sleep 2
    ((attempt++))
  done
  
  print_status $RED "❌ $service_name failed to become ready"
  return 1
}

# Function to run tests with proper error handling
run_test_suite() {
  local test_name=$1
  local test_command=$2
  
  print_status $BLUE "🔍 Running $test_name..."
  
  if eval "$test_command"; then
    print_status $GREEN "✅ $test_name passed"
    return 0
  else
    print_status $RED "❌ $test_name failed"
    return 1
  fi
}

# Setup test environment
setup_test_environment() {
  print_status $BLUE "🔧 Setting up test environment..."
  
  # Install test dependencies
  if [ ! -d "node_modules" ]; then
    print_status $YELLOW "📦 Installing dependencies..."
    yarn install
  fi
  
  # Install test-specific dependencies
  yarn add --dev mocha chai supertest autocannon node-fetch
  
  # Create test directories
  mkdir -p tests/fixtures
  mkdir -p tests/reports
  
  # Set environment variables for testing
  export NODE_ENV=test
  export API_GATEWAY_URL=http://localhost:80
  export LOAD_TEST_CONNECTIONS=$LOAD_TEST_CONNECTIONS
  export LOAD_TEST_DURATION=$LOAD_TEST_DURATION
  
  print_status $GREEN "✅ Test environment setup complete"
}

# Start services if needed
start_services() {
  print_status $BLUE "🚀 Starting services..."
  
  # Check if services are already running
  if docker-compose ps | grep -q "Up"; then
    print_status $YELLOW "⚠️  Services already running, skipping startup"
  else
    print_status $YELLOW "🔄 Starting Docker services..."
    docker-compose up -d
    
    # Wait for services to be ready
    wait_for_service "API Gateway" "http://localhost:80"
    wait_for_service "Auth Service" "http://localhost:3001"
    wait_for_service "User Service" "http://localhost:3002"
    wait_for_service "Skin Analysis Service" "http://localhost:3003"
    wait_for_service "Hair Try-On Service" "http://localhost:3004"
  fi
}

# Run health checks
run_health_checks() {
  print_status $BLUE "🏥 Running health checks..."
  
  local services=(
    "API Gateway:http://localhost:80"
    "Auth Service:http://localhost:3001"
    "User Service:http://localhost:3002"
    "Skin Analysis Service:http://localhost:3003"
    "Hair Try-On Service:http://localhost:3004"
  )
  
  local failed_services=()
  
  for service_info in "${services[@]}"; do
    IFS=':' read -r service_name service_url <<< "$service_info"
    
    if curl -s -f "$service_url/health" > /dev/null 2>&1; then
      print_status $GREEN "✅ $service_name is healthy"
    else
      print_status $RED "❌ $service_name is unhealthy"
      failed_services+=("$service_name")
    fi
  done
  
  if [ ${#failed_services[@]} -gt 0 ]; then
    print_status $RED "❌ Health checks failed for: ${failed_services[*]}"
    return 1
  fi
  
  print_status $GREEN "✅ All services are healthy"
  return 0
}

# Run unit tests for shared utilities
run_unit_tests() {
  print_status $BLUE "🧪 Running unit tests..."
  
  # Create simple unit tests for shared utilities
  cat > tests/unit/shared.test.js << 'EOF'
const { expect } = require('chai');
const path = require('path');

describe('Shared Utilities', function() {
  describe('Redis Cache', function() {
    it('should be importable', function() {
      expect(() => {
        require('../../shared/cache/redis');
      }).to.not.throw();
    });
  });

  describe('Circuit Breaker', function() {
    it('should be importable', function() {
      expect(() => {
        const { CircuitBreaker } = require('../../shared/resilience/circuitBreaker');
        expect(CircuitBreaker).to.be.a('function');
      }).to.not.throw();
    });
  });

  describe('Correlation Logger', function() {
    it('should be importable', function() {
      expect(() => {
        require('../../shared/logging/correlationLogger');
      }).to.not.throw();
    });
  });
});
EOF

  mkdir -p tests/unit
  run_test_suite "Unit Tests" "yarn dlx mocha tests/unit/*.test.js --timeout 10000"
}

# Run end-to-end tests
run_e2e_tests() {
  print_status $BLUE "🔄 Running end-to-end tests..."
  
  run_test_suite "E2E Tests" "yarn dlx mocha tests/e2e/userWorkflows.test.js --timeout 60000"
}

# Run load tests
run_load_tests() {
  if [ "$RUN_LOAD_TESTS" != "true" ]; then
    print_status $YELLOW "⏭️  Skipping load tests (RUN_LOAD_TESTS=false)"
    return 0
  fi
  
  print_status $BLUE "⚡ Running load tests..."
  
  run_test_suite "Load Tests" "node tests/load/loadTest.js"
}

# Generate test report
generate_test_report() {
  print_status $BLUE "📊 Generating test report..."
  
  local report_file="tests/reports/integration-test-report-$(date +%Y%m%d-%H%M%S).json"
  
  cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$TEST_ENV",
  "configuration": {
    "skipSetup": "$SKIP_SETUP",
    "runLoadTests": "$RUN_LOAD_TESTS",
    "loadTestConnections": "$LOAD_TEST_CONNECTIONS",
    "loadTestDuration": "$LOAD_TEST_DURATION"
  },
  "results": {
    "healthChecks": $health_check_result,
    "unitTests": $unit_test_result,
    "e2eTests": $e2e_test_result,
    "loadTests": $load_test_result
  },
  "summary": {
    "totalTests": 4,
    "passed": $((health_check_result + unit_test_result + e2e_test_result + load_test_result)),
    "failed": $((4 - health_check_result - unit_test_result - e2e_test_result - load_test_result)),
    "overallResult": "$overall_result"
  }
}
EOF
  
  print_status $GREEN "📄 Test report saved to: $report_file"
}

# Cleanup function
cleanup() {
  print_status $BLUE "🧹 Cleaning up..."
  
  # Remove temporary test files
  rm -f tests/unit/shared.test.js
  rm -f tests/fixtures/test-*.jpg
  rm -f tests/fixtures/test-*.mp4
  rm -f tests/load/test-load-image.jpg
  
  print_status $GREEN "✅ Cleanup complete"
}

# Main execution
main() {
  local exit_code=0
  
  # Initialize result variables
  health_check_result=0
  unit_test_result=0
  e2e_test_result=0
  load_test_result=0
  
  # Trap cleanup on exit
  trap cleanup EXIT
  
  # Setup
  if [ "$SKIP_SETUP" != "true" ]; then
    setup_test_environment || exit_code=1
    start_services || exit_code=1
  fi
  
  # Run tests
  if [ $exit_code -eq 0 ]; then
    run_health_checks && health_check_result=1
    run_unit_tests && unit_test_result=1
    run_e2e_tests && e2e_test_result=1
    run_load_tests && load_test_result=1
  fi
  
  # Determine overall result
  local total_passed=$((health_check_result + unit_test_result + e2e_test_result + load_test_result))
  if [ $total_passed -eq 4 ]; then
    overall_result="PASSED"
    print_status $GREEN "🎉 All integration tests passed!"
  else
    overall_result="FAILED"
    print_status $RED "❌ Some integration tests failed ($total_passed/4 passed)"
    exit_code=1
  fi
  
  # Generate report
  generate_test_report
  
  # Print summary
  echo ""
  print_status $BLUE "📋 Test Summary:"
  echo "   Health Checks: $([ $health_check_result -eq 1 ] && echo "✅ PASSED" || echo "❌ FAILED")"
  echo "   Unit Tests: $([ $unit_test_result -eq 1 ] && echo "✅ PASSED" || echo "❌ FAILED")"
  echo "   E2E Tests: $([ $e2e_test_result -eq 1 ] && echo "✅ PASSED" || echo "❌ FAILED")"
  echo "   Load Tests: $([ $load_test_result -eq 1 ] && echo "✅ PASSED" || echo "❌ FAILED")"
  echo ""
  print_status $BLUE "Overall Result: $overall_result"
  
  exit $exit_code
}

# Handle command line arguments
case "${1:-}" in
  --help|-h)
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --skip-setup     Skip environment setup and service startup"
    echo "  --no-load-tests  Skip load testing"
    echo "  --quick          Run with minimal load test settings"
    echo "  --help           Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  TEST_ENV                 Test environment (default: test)"
    echo "  SKIP_SETUP              Skip setup (default: false)"
    echo "  RUN_LOAD_TESTS          Run load tests (default: true)"
    echo "  LOAD_TEST_CONNECTIONS   Load test connections (default: 5)"
    echo "  LOAD_TEST_DURATION      Load test duration in seconds (default: 30)"
    exit 0
    ;;
  --skip-setup)
    export SKIP_SETUP=true
    ;;
  --no-load-tests)
    export RUN_LOAD_TESTS=false
    ;;
  --quick)
    export LOAD_TEST_CONNECTIONS=2
    export LOAD_TEST_DURATION=10
    ;;
esac

# Run main function
main "$@"