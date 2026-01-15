#!/bin/bash
# Script to run all contract tests
# This script runs all test files and shows a summary

echo "=================================================="
echo "   CHESSNOTH - RUNNING ALL CONTRACT TESTS"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Run tests
echo "Running CharacterNFT tests..."
echo "-------------------------------"
npx hardhat test tests/contracts/CharacterNFT.test.js tests/contracts/CharacterNFT.advanced.test.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ CharacterNFT tests passed${NC}"
else
    echo -e "${RED}✗ CharacterNFT tests failed${NC}"
    exit 1
fi

echo ""
echo "Running CHSToken tests..."
echo "-------------------------------"
npx hardhat test tests/contracts/CHSToken.test.js tests/contracts/CHSToken.advanced.test.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ CHSToken tests passed${NC}"
else
    echo -e "${RED}✗ CHSToken tests failed${NC}"
    exit 1
fi

echo ""
echo "Running Marketplace tests..."
echo "-------------------------------"
npx hardhat test tests/contracts/Marketplace.test.js tests/contracts/Marketplace.advanced.test.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Marketplace tests passed${NC}"
else
    echo -e "${RED}✗ Marketplace tests failed${NC}"
    exit 1
fi

echo ""
echo "=================================================="
echo -e "${GREEN}   ALL TESTS PASSED! ✓${NC}"
echo "=================================================="
echo ""
echo "Test Summary:"
echo "  - CharacterNFT: Basic + Advanced tests"
echo "  - CHSToken: Basic + Advanced tests"
echo "  - Marketplace: Basic + Advanced tests"
echo ""
echo "Total test files: 6"
echo ""
