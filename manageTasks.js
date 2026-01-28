const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Load the JSON data
const dataPath = path.join(__dirname, 'prd.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const fileContent = fs.readFileSync(dataPath, 'utf8').split('\n');

// Find line numbers for each requirement by searching for their IDs
const findLineNumber = (id) => {
  for (let i = 0; i < fileContent.length; i++) {
    if (fileContent[i].includes(`"id": "${id}"`)) {
      return i + 1; // Line numbers are 1-indexed
    }
  }
  return 0;
};

// Extract and sort requirements
const requirements = data.requirements
  .map((req) => ({
    id: req.id,
    category: req.category,
    passes: req.passes,
    priority: req.priority,
    lineNumber: findLineNumber(req.id)
  }))
  .sort((a, b) => {
    if (a.priority === b.priority) {
      return a.id.localeCompare(b.id);
    }
    return a.priority - b.priority;
  });

// Helper functions for color coding
const colorPasses = (passes) => {
  return passes ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
};

const colorPriority = (priority) => {
  if (priority <= 1) return `${colors.red}P${priority}${colors.reset}`;
  if (priority <= 2) return `${colors.yellow}P${priority}${colors.reset}`;
  return `${colors.cyan}P${priority}${colors.reset}`;
};

// Print summary
console.log('\n📋 Task Summary:\n');
requirements.forEach(req => {
  const link = `${dataPath}:${req.lineNumber}`;
  console.log(`${colorPriority(req.priority)} | ${req.id} | ${req.category} | ${colorPasses(req.passes)} | ${link}`);
});
console.log(`\n${colors.magenta}Total: ${requirements.length} tasks${colors.reset}\n`);
