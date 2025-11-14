#!/bin/bash

echo "🧪 Testing Docker Setup for Retail App"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

# Test 1: Check Docker is installed
echo "Test 1: Checking Docker installation..."
docker --version > /dev/null 2>&1
test_result $? "Docker is installed"

# Test 2: Check Docker is running
echo "Test 2: Checking if Docker daemon is running..."
docker ps > /dev/null 2>&1
test_result $? "Docker daemon is running"

# Test 3: Check Docker Compose is installed
echo "Test 3: Checking Docker Compose installation..."
docker-compose --version > /dev/null 2>&1
test_result $? "Docker Compose is installed"

# Test 4: Validate docker-compose-vite.yml syntax
echo "Test 4: Validating Docker Compose configuration..."
docker-compose -f docker-compose-vite.yml config > /dev/null 2>&1
test_result $? "Docker Compose configuration is valid"

# Test 5: Check if .env file exists
echo "Test 5: Checking .env file..."
if [ -f .env ]; then
    test_result 0 ".env file exists"
else
    test_result 1 ".env file exists"
fi

# Test 6: Check backend Dockerfile exists
echo "Test 6: Checking backend Dockerfile..."
if [ -f backend/Dockerfile.vite ]; then
    test_result 0 "Backend Dockerfile exists"
else
    test_result 1 "Backend Dockerfile exists"
fi

# Test 7: Check frontend Dockerfile exists
echo "Test 7: Checking frontend Dockerfile..."
if [ -f frontend/Dockerfile.build ]; then
    test_result 0 "Frontend Dockerfile exists"
else
    test_result 1 "Frontend Dockerfile exists"
fi

# Test 8: Check Prisma schema exists
echo "Test 8: Checking Prisma schema..."
if [ -f prisma/schema.prisma ]; then
    test_result 0 "Prisma schema exists"
else
    test_result 1 "Prisma schema exists"
fi

# Test 9: Check backend package.json exists
echo "Test 9: Checking backend package.json..."
if [ -f backend/package.json ]; then
    test_result 0 "Backend package.json exists"
else
    test_result 1 "Backend package.json exists"
fi

# Test 10: Check frontend package.json exists
echo "Test 10: Checking frontend package.json..."
if [ -f frontend/package.json ]; then
    test_result 0 "Frontend package.json exists"
else
    test_result 1 "Frontend package.json exists"
fi

# Test 11: Check vite.config.js exists
echo "Test 11: Checking Vite configuration..."
if [ -f frontend/vite.config.js ]; then
    test_result 0 "vite.config.js exists"
else
    test_result 1 "vite.config.js exists"
fi

# Test 12: Check backend source directory
echo "Test 12: Checking backend source directory..."
if [ -d backend/src ]; then
    test_result 0 "Backend src directory exists"
else
    test_result 1 "Backend src directory exists"
fi

# Test 13: Check frontend source directory
echo "Test 13: Checking frontend source directory..."
if [ -d frontend/src ]; then
    test_result 0 "Frontend src directory exists"
else
    test_result 1 "Frontend src directory exists"
fi

# Summary
echo ""
echo "========================================"
echo "📊 Test Summary"
echo "========================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Docker setup is ready.${NC}"
    echo ""
    echo "To start the application:"
    echo "  ./docker-run.sh"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please fix the issues above.${NC}"
    echo ""
    exit 1
fi
