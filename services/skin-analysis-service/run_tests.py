#!/usr/bin/env python3
"""
Test runner script for Skin Analysis Service
Runs different types of tests with appropriate configurations
"""

import subprocess
import sys
import os
import argparse


def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(command)}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: {description} failed with exit code {e.returncode}")
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(description="Run Skin Analysis Service tests")
    parser.add_argument("--unit", action="store_true", help="Run unit tests only")
    parser.add_argument("--integration", action="store_true", help="Run integration tests only")
    parser.add_argument("--performance", action="store_true", help="Run performance tests only")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--coverage", action="store_true", help="Run with coverage report")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    # Default to running all tests if no specific type is selected
    if not any([args.unit, args.integration, args.performance]):
        args.all = True
    
    # Change to the service directory
    service_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(service_dir)
    
    success = True
    
    # Base pytest command
    base_cmd = ["python", "-m", "pytest"]
    
    if args.verbose:
        base_cmd.append("-v")
    
    if args.coverage:
        base_cmd.extend(["--cov=app", "--cov-report=html", "--cov-report=term"])
    
    # Run unit tests
    if args.unit or args.all:
        cmd = base_cmd + ["-m", "unit", "tests/"]
        if not run_command(cmd, "Unit Tests"):
            success = False
    
    # Run integration tests
    if args.integration or args.all:
        cmd = base_cmd + ["-m", "integration", "tests/"]
        if not run_command(cmd, "Integration Tests"):
            success = False
    
    # Run performance tests
    if args.performance or args.all:
        cmd = base_cmd + ["-m", "performance", "tests/"]
        if not run_command(cmd, "Performance Tests"):
            success = False
    
    # Run all tests if --all is specified
    if args.all and not (args.unit or args.integration or args.performance):
        cmd = base_cmd + ["tests/"]
        if not run_command(cmd, "All Tests"):
            success = False
    
    # Summary
    print(f"\n{'='*60}")
    if success:
        print("✅ All tests completed successfully!")
    else:
        print("❌ Some tests failed. Check the output above for details.")
    print(f"{'='*60}")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())