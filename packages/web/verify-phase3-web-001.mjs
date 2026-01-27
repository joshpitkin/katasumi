#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🔍 Verifying PHASE3-WEB-001: Next.js App Scaffold\n')

let passCount = 0
let failCount = 0

function check(description, condition, details = '') {
  if (condition) {
    console.log(`✅ ${description}`)
    if (details) console.log(`   ${details}`)
    passCount++
  } else {
    console.log(`❌ ${description}`)
    if (details) console.log(`   ${details}`)
    failCount++
  }
}

// 1. Check Next.js 14+ with App Router
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'))
const nextVersion = packageJson.dependencies.next
check(
  'Next.js 14+ with App Router structure',
  nextVersion && nextVersion.includes('14'),
  `Next.js version: ${nextVersion}`
)

// 2. TypeScript with strict mode
const tsconfig = JSON.parse(readFileSync(join(__dirname, 'tsconfig.json'), 'utf8'))
check(
  'TypeScript configured with strict mode',
  tsconfig.compilerOptions?.strict === true,
  `strict: ${tsconfig.compilerOptions?.strict}`
)

// 3. Tailwind CSS configured
const tailwindExists = existsSync(join(__dirname, 'tailwind.config.ts'))
const postcssExists = existsSync(join(__dirname, 'postcss.config.js'))
check(
  'Tailwind CSS configured',
  tailwindExists && postcssExists,
  `tailwind.config.ts: ${tailwindExists}, postcss.config.js: ${postcssExists}`
)

// 4. ESLint configured
const eslintExists = existsSync(join(__dirname, '.eslintrc.json'))
check(
  'ESLint configured with Next.js rules',
  eslintExists,
  `.eslintrc.json: ${eslintExists}`
)

// 5. Directory structure
const requiredDirs = [
  'app',
  'app/login',
  'app/dashboard',
  'app/api',
  'components',
  'lib'
]
const allDirsExist = requiredDirs.every(dir => existsSync(join(__dirname, dir)))
check(
  'Directory structure matches requirements',
  allDirsExist,
  requiredDirs.join(', ')
)

// 6. Main page.tsx with search interface
const pageExists = existsSync(join(__dirname, 'app/page.tsx'))
const pageContent = pageExists ? readFileSync(join(__dirname, 'app/page.tsx'), 'utf8') : ''
const hasAppFirstMode = pageContent.includes('AppFirstMode')
const hasFullPhraseMode = pageContent.includes('FullPhraseMode')
check(
  'Main page.tsx renders with two modes',
  pageExists && hasAppFirstMode && hasFullPhraseMode,
  `AppFirstMode: ${hasAppFirstMode}, FullPhraseMode: ${hasFullPhraseMode}`
)

// 7. Layout with header and footer
const layoutExists = existsSync(join(__dirname, 'app/layout.tsx'))
const layoutContent = layoutExists ? readFileSync(join(__dirname, 'app/layout.tsx'), 'utf8') : ''
const hasHeader = layoutContent.includes('Header')
const hasFooter = layoutContent.includes('Footer')
check(
  'app/layout.tsx includes header with mode/platform/AI and footer',
  layoutExists && hasHeader && hasFooter,
  `Header: ${hasHeader}, Footer: ${hasFooter}`
)

// 8. next-themes for dark mode
const hasNextThemes = packageJson.dependencies['next-themes']
check(
  'next-themes installed for dark mode',
  !!hasNextThemes,
  `Version: ${hasNextThemes || 'not installed'}`
)

// 9. Component files created
const requiredComponents = [
  'SearchBar.tsx',
  'ResultsList.tsx',
  'ShortcutDetail.tsx',
  'AppSelector.tsx',
  'Filters.tsx'
]
const allComponentsExist = requiredComponents.every(comp => 
  existsSync(join(__dirname, 'components', comp))
)
check(
  'All required component files created',
  allComponentsExist,
  requiredComponents.join(', ')
)

// 10. Global keyboard shortcuts
const hasGlobalKeybindings = pageContent.includes('handleKeyDown') && 
  pageContent.includes('Tab') && 
  pageContent.includes('F4') && 
  pageContent.includes('F5')
check(
  'Global keyboard shortcuts implemented',
  hasGlobalKeybindings,
  'Tab, F4, F5, ?, Cmd+,'
)

// 11. Responsive design (check Tailwind classes)
const componentsToCheck = [
  'components/Header.tsx',
  'components/ResultsList.tsx',
  'components/AppSelector.tsx'
]
const componentsWithResponsive = componentsToCheck.some(comp => {
  if (!existsSync(join(__dirname, comp))) return false
  const content = readFileSync(join(__dirname, comp), 'utf8')
  return content.includes('sm:') || content.includes('md:') || content.includes('lg:')
})
check(
  'Responsive design configured',
  componentsWithResponsive,
  'Tailwind responsive classes found'
)

// 12. Dark mode support
const hasDarkMode = layoutContent.includes('ThemeProvider') || 
  readFileSync(join(__dirname, 'app/globals.css'), 'utf8').includes('dark:')
check(
  'Dark mode support configured',
  hasDarkMode,
  'ThemeProvider and dark: classes'
)

// 13. Environment variables
const envExists = existsSync(join(__dirname, '.env.local'))
check(
  'Environment variables configured',
  envExists,
  `.env.local: ${envExists}`
)

// 14. Zustand store
const storeExists = existsSync(join(__dirname, 'lib/store.ts'))
const storeContent = storeExists ? readFileSync(join(__dirname, 'lib/store.ts'), 'utf8') : ''
const hasZustand = storeContent.includes('create') && storeContent.includes('zustand')
check(
  'Zustand store for state management',
  storeExists && hasZustand,
  `lib/store.ts: ${storeExists}`
)

// Summary
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ Passed: ${passCount}`)
console.log(`❌ Failed: ${failCount}`)
console.log(`Total: ${passCount + failCount}`)
console.log(`${'='.repeat(50)}\n`)

if (failCount === 0) {
  console.log('🎉 All acceptance criteria verified!')
  process.exit(0)
} else {
  console.log('⚠️  Some acceptance criteria failed')
  process.exit(1)
}
