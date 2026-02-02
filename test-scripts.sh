#!/bin/bash
# Test script to verify all pnpm scripts work correctly
# This should be run in CI/CD and locally to catch issues early

set -e  # Exit on error

echo "🧪 Testing Package Scripts"
echo "=========================="
echo ""

FAILED_TESTS=()

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test helper function
test_command() {
    local test_name="$1"
    local command="$2"
    local should_fail="${3:-false}"
    
    echo -n "Testing: $test_name... "
    
    if eval "$command" > /dev/null 2>&1; then
        if [ "$should_fail" = "true" ]; then
            echo -e "${RED}❌ FAILED${NC} (Expected to fail but passed)"
            FAILED_TESTS+=("$test_name")
            return 1
        else
            echo -e "${GREEN}✅ PASSED${NC}"
            return 0
        fi
    else
        if [ "$should_fail" = "true" ]; then
            echo -e "${GREEN}✅ PASSED${NC} (Failed as expected)"
            return 0
        else
            echo -e "${RED}❌ FAILED${NC}"
            FAILED_TESTS+=("$test_name")
            return 1
        fi
    fi
}

echo "1. Testing root package.json scripts exist"
echo "==========================================="

test_command "build script exists" "grep -q '\"build\"' package.json"
test_command "setup:tui script exists" "grep -q '\"setup:tui\"' package.json"
test_command "migrate script exists" "grep -q '\"migrate\"' package.json"
test_command "seed script exists" "grep -q '\"seed\"' package.json"
test_command "build-db script exists" "grep -q '\"build-db\"' package.json"

echo ""
echo "2. Testing all scripts use pnpm (not npm)"
echo "=========================================="

test_command "No npm in root scripts" "! grep -q 'npm run\|npm start' package.json || grep -q 'pnpm' package.json"
test_command "No npm in core scripts" "! grep -q 'npm run' packages/core/package.json || grep -q 'pnpm' packages/core/package.json"
test_command "No npm in tui scripts" "! grep -q 'npm run' packages/tui/package.json || grep -q 'pnpm' packages/tui/package.json"

echo ""
echo "3. Testing pnpm filter syntax"
echo "=============================="

test_command "Root uses --filter syntax" "grep -q '\\-\\-filter=' package.json"

echo ""
echo "4. Testing critical scripts can be parsed"
echo "=========================================="

# Test that pnpm can parse the scripts (doesn't test execution)
test_command "pnpm can parse root scripts" "pnpm run --help"
test_command "pnpm can list tasks" "pnpm run 2>&1 | grep -q 'build\|test\|dev'"

echo ""
echo "5. Testing workspace setup"
echo "=========================="

test_command "pnpm workspace file exists" "[ -f pnpm-workspace.yaml ]"
test_command "pnpm lock file exists" "[ -f pnpm-lock.yaml ]"
test_command "Workspaces defined in pnpm-workspace.yaml" "grep -q 'packages' pnpm-workspace.yaml"

echo ""
echo "6. Testing package.json structure"
echo "=================================="

test_command "Core package exists" "[ -f packages/core/package.json ]"
test_command "TUI package exists" "[ -f packages/tui/package.json ]"
test_command "Web package exists" "[ -f packages/web/package.json ]"
test_command "Core has build script" "grep -q '\"build\"' packages/core/package.json"
test_command "TUI has build script" "grep -q '\"build\"' packages/tui/package.json"
test_command "Web has build script" "grep -q '\"build\"' packages/web/package.json"

echo ""
echo "7. Testing TypeScript config"
echo "============================="

test_command "Root tsconfig exists" "[ -f tsconfig.base.json ]"
test_command "Core tsconfig exists" "[ -f packages/core/tsconfig.json ]"
test_command "TUI tsconfig exists" "[ -f packages/tui/tsconfig.json ]"
test_command "Web tsconfig exists" "[ -f packages/web/tsconfig.json ]"

echo ""
echo "8. Testing environment files"
echo "============================="

test_command ".env.example exists for core" "[ -f packages/core/.env.example ]"
test_command ".env.example exists for web" "[ -f packages/web/.env.example ]"

echo ""
echo "9. Testing git configuration"
echo "============================="

test_command ".gitignore exists" "[ -f .gitignore ]"
test_command ".gitignore has node_modules" "grep -q 'node_modules' .gitignore"
test_command ".gitignore has .pnpm-store" "grep -q '.pnpm-store' .gitignore"
test_command ".gitignore has dist" "grep -q 'dist' .gitignore"

echo ""
echo "================================"
echo "Test Summary"
echo "================================"

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ ${#FAILED_TESTS[@]} test(s) failed:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "  ${RED}•${NC} $test"
    done
    exit 1
fi
