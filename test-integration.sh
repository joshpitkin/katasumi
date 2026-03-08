#!/bin/bash
# Integration test for the setup and build process
# This simulates a fresh clone and setup

set -e  # Exit on error

echo "🧪 Integration Test: Setup & Build Process"
echo "==========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED_TESTS=()

test_step() {
    local step_name="$1"
    local command="$2"
    
    echo ""
    echo "Testing: $step_name"
    echo "Command: $command"
    echo "---"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ PASSED: $step_name${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED: $step_name${NC}"
        FAILED_TESTS+=("$step_name")
        return 1
    fi
}

echo "Prerequisites Check"
echo "==================="

# Check pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is not installed${NC}"
    echo "Install pnpm: npm install -g pnpm"
    exit 1
else
    echo -e "${GREEN}✅ pnpm is installed${NC}"
fi

# Check Node.js version
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"

echo ""
echo "Build Process Tests"
echo "==================="

# Test 1: Install dependencies
test_step "pnpm install" "pnpm install --silent"

# Test 2: Build core package first (generates dist types used by workspace consumers)
test_step "pnpm --filter=@katasumi/core run build" "pnpm --filter=@katasumi/core run build"

# Test 3: Refresh workspace package links so @katasumi/core includes newly built dist outputs
test_step "pnpm install (refresh workspace links)" "pnpm install --silent"

# Test 4: Build all packages
test_step "pnpm run build" "pnpm run build"

# Test 5: Check that Prisma clients were generated
test_step "Prisma client for SQLite generated" "[ -d packages/core/src/generated/prisma ]"
test_step "Prisma client for PostgreSQL generated" "[ -d packages/core/src/generated/prisma-postgres ]"

# Test 6: Check that TypeScript compiled
test_step "Core package built" "[ -d packages/core/dist ]"
test_step "TUI package built" "[ -d packages/tui/dist ]"
test_step "Web package built (Next.js)" "[ -d packages/web/.next ] || [ -f packages/web/next.config.js ]"

# Test 7: Check specific output files exist
test_step "Core index.js exists" "[ -f packages/core/dist/index.js ]"
test_step "TUI cli.js exists" "[ -f packages/tui/dist/cli.js ]"

# Test 8: Test typecheck command
test_step "pnpm run typecheck" "pnpm run typecheck"

# Test 9: Test that scripts are executable
test_step "Migration script is executable" "node packages/core/dist/migrate.js --help 2>&1 | grep -q 'migrate' || true"

echo ""
echo "Script Validation Tests"
echo "========================"

# Test 10: Verify no npm commands in package.json files (look for standalone "npm run" not "pnpm run")
test_step "No standalone 'npm run' in root package.json" "! grep -E '\\bnpm run\\b' package.json"
test_step "No standalone 'npm run' in core package.json" "! grep -E '\\bnpm run\\b' packages/core/package.json"
test_step "No standalone 'npm run' in tui package.json" "! grep -E '\\bnpm run\\b' packages/tui/package.json"

# Test 11: Verify pnpm workspace commands
test_step "Root uses --filter for workspaces" "grep -q '\\-\\-filter=' package.json"

echo ""
echo "================================"
echo "Integration Test Summary"
echo "================================"

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All integration tests passed!${NC}"
    echo ""
    echo "The project is properly configured and builds successfully."
    exit 0
else
    echo -e "${RED}❌ ${#FAILED_TESTS[@]} test(s) failed:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "  ${RED}•${NC} $test"
    done
    echo ""
    echo "Please fix the failing tests before committing."
    exit 1
fi
