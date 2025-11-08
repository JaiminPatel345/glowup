#!/usr/bin/env python3
"""
Test runner for Hair Try-On Service
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {command}")
    print('='*60)
    
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent
        )
        
        if result.stdout:
            print("STDOUT:")
            print(result.stdout)
        
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
            
        print(f"✅ {description} completed successfully")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed with exit code {e.returncode}")
        
        if e.stdout:
            print("STDOUT:")
            print(e.stdout)
        
        if e.stderr:
            print("STDERR:")
            print(e.stderr)
            
        return False

def main():
    """Main test runner"""
    print("Hair Try-On Service Test Runner")
    print("=" * 60)
    
    # Change to service directory
    service_dir = Path(__file__).parent
    os.chdir(service_dir)
    
    # Test categories to run
    test_categories = [
        ("pytest tests/test_video_service.py -v -m unit", "Video Service Unit Tests"),
        ("pytest tests/test_ai_service.py -v -m unit", "AI Service Unit Tests"),
        ("pytest tests/test_websocket_service.py -v -m unit", "WebSocket Service Unit Tests"),
        ("pytest tests/test_database_service.py -v -m unit", "Database Service Unit Tests"),
        ("pytest tests/test_api_integration.py -v -m integration", "API Integration Tests"),
        ("pytest tests/test_performance.py -v -m performance", "Performance Tests"),
    ]
    
    # Optional: Run all tests at once
    all_tests = [
        ("pytest tests/ -v --tb=short", "All Tests"),
        ("pytest tests/ -v --cov=app --cov-report=html", "All Tests with Coverage"),
    ]
    
    results = []
    
    # Run individual test categories
    for command, description in test_categories:
        success = run_command(command, description)
        results.append((description, success))
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    total_tests = len(results)
    passed_tests = sum(1 for _, success in results if success)
    failed_tests = total_tests - passed_tests
    
    for description, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{description:<40} {status}")
    
    print("-" * 60)
    print(f"Total: {total_tests}, Passed: {passed_tests}, Failed: {failed_tests}")
    
    if failed_tests > 0:
        print(f"\n❌ {failed_tests} test categories failed!")
        return 1
    else:
        print(f"\n✅ All {passed_tests} test categories passed!")
        
        # Optionally run coverage report
        if "--coverage" in sys.argv:
            print("\nGenerating coverage report...")
            run_command(
                "pytest tests/ --cov=app --cov-report=html --cov-report=term",
                "Coverage Report"
            )
            print("Coverage report generated in htmlcov/index.html")
        
        return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)