# Katasumi (隅) - Your Corner Companion for Keyboard Shortcuts

[![Build Status](https://img.shields.io/github/actions/workflow/status/joshpitkin/katasumi/ci.yml?branch=main)](https://github.com/joshpitkin/katasumi/actions)
[![Version](https://img.shields.io/npm/v/katasumi.svg)](https://www.npmjs.com/package/katasumi)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Downloads](https://img.shields.io/npm/dt/katasumi.svg)](https://www.npmjs.com/package/katasumi)

**Katasumi** (カタスミ / 隅) - meaning "in the corner" - is an AI-powered keyboard shortcut discovery tool that stays quietly in the background, ready to help whenever you need it.

Like a helpful friend waiting in the corner of your workspace, Katasumi provides instant access to keyboard shortcuts across terminal and desktop applications, supporting you without getting in the way.

## 📑 Table of Contents

- [Philosophy](#-philosophy)
- [Features](#-features)
- [Architecture](#️-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
  - [Development Workflow](#development-workflow)
  - [Testing & Running](#testing--running)
- [Database Strategy](#-database-strategy)
- [Documentation](#-documentation)
- [Development](#️-development)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Philosophy

The name "katasumi" embodies our design philosophy:

- **Always There**: Like something resting in the corner, always accessible but never intrusive
- **Background Support**: Provides help exactly when you need it, then gets out of your way
- **Quiet Helper**: Runs unobtrusively, blending into your workflow
- **Reliable Companion**: Dependable support for your daily productivity

## ✨ Features

### Terminal Interface (TUI)
- 🚀 Lightning-fast fuzzy search for keyboard shortcuts
- 📦 Works 100% offline with bundled shortcuts database
- 🎨 Multiple search modes: App-First, Full-Phrase, and Detail View
- 💾 Local caching of custom shortcuts
- 🤖 AI-powered scraping for long-tail applications (optional)

### Web Interface
- 🌐 Accessible from any browser
- 🔍 Shared database of curated shortcuts
- 💎 Premium tier with managed API keys for AI searches
- 📱 Responsive design for desktop and mobile

## 🏗️ Architecture

Katasumi uses a monorepo structure with shared core logic:

```
katasumi/
├── packages/
│   ├── core/              # Shared search & scraping logic
│   ├── tui/               # Terminal interface
│   └── web/               # Web interface (React/Next.js)
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### Tech Stack

**Core (Shared)**
- TypeScript
- Prisma ORM (unified schema for SQLite + PostgreSQL)
- Keyword search + Optional AI (OpenAI/Claude/Ollama)

**TUI**
- SQLite for local storage
- Zero-config setup
- Fast local queries (<10ms)

**Web**
- Next.js (React) + Vercel
- PostgreSQL (Supabase/Vercel Postgres)
- Tailwind CSS

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm (or pnpm)
- For development: The project uses Turborepo for monorepo management

### Quick Install (TUI)

Install Katasumi globally for instant access from any terminal:

```bash
npm install -g katasumi
```

Then launch it with:

```bash
katasumi
```

**Note:** Global installation is not yet available as the package has not been published to npm. For now, use the development installation method below.

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/joshpitkin/katasumi.git
   cd katasumi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run first-time setup:**
   ```bash
   npm run setup
   ```
   
   This step:
   - Generates Prisma clients and compiles TypeScript
   - Runs database migrations
   - Seeds the database with 770+ shortcuts across 8 popular apps
   - Builds the bundled shortcuts.db for the TUI
   
   This is required before running `npm run dev` for the first time.

4. **Start development servers:**
   
   **Run all packages in parallel (recommended):**
   ```bash
   npm run dev
   ```
   This starts both TUI and Web development servers simultaneously.

   **Run TUI only:**
   ```bash
   npm run dev --workspace=@katasumi/tui
   ```
   The TUI (Terminal User Interface) will watch for file changes and recompile automatically.

   **Run Web only:**
   ```bash
   npm run dev --workspace=@katasumi/web
   ```
   The web development server will start at http://localhost:3000 with hot reload enabled.

### Development Workflow

**Working on the TUI:**
- Changes to `packages/tui/src/**` will auto-recompile via TypeScript watch mode
- Changes to `packages/core/src/**` require rebuilding core: `npm run build --workspace=@katasumi/core`
- Test the TUI interactively by running: `npm run start:tui`
- Or use the workspace command: `npm start --workspace=@katasumi/tui`

**Working on the Web app:**
- Changes to `packages/web/**` will hot-reload automatically via Next.js Fast Refresh
- Changes to `packages/core/src/**` require rebuilding core: `npm run build --workspace=@katasumi/core`
- Access the web app at http://localhost:3000
- Check the browser console for any runtime errors

**Working on Core:**
- After modifying `packages/core/src/**`, run:
  ```bash
  npm run build --workspace=@katasumi/core
  ```
- This regenerates Prisma clients and compiles TypeScript
- Both TUI and Web will pick up the changes on their next rebuild/reload

### Testing & Running

**Run the TUI interactively:**
```bash
npm run start:tui
```

**Run the Web app:**
```bash
npm run start:web
```
Then visit http://localhost:3000

**Note:** Make sure to run `npm run setup` first if you haven't already. The TUI requires the database to be seeded and the bundled shortcuts.db to be built.

### First-Time Setup Notes

The setup step is crucial on first setup as it:
- Generates Prisma clients for both SQLite and PostgreSQL
- Compiles TypeScript to ensure type definitions are available
- Creates necessary generated files in the `packages/core/src/generated` directory
- Runs database migrations to create the schema
- Seeds the database with curated shortcuts for 8 popular applications
- Builds the bundled shortcuts.db file that ships with the TUI

If you encounter type errors when running `npm run dev`, make sure you've run `npm run setup` first.

**Note:** After the initial setup, you typically only need `npm run build` when:
- Prisma schema files are modified
- You pull changes that affect the core package
- You want to rebuild without re-seeding the database

### Running Unobtrusively

Katasumi is designed to stay out of your way. Here are some tips for running it unobtrusively:

- **TUI Mode**: Assign a global keyboard shortcut to launch Katasumi instantly
- **Background Process**: Run the TUI in a tmux/screen session for instant access
- **Terminal Dropdown**: Use with terminal drop-down tools (e.g., Guake, iTerm2 Hotkey Window)
- **Web Bookmarklet**: Save the web version as a bookmarklet for quick browser access

## 📊 Database Strategy

Katasumi uses a hybrid approach:

- **Bundled Core DB**: Ships with shortcuts for popular apps (vim, tmux, VSCode, etc.)
- **Local Cache**: Stores your custom and scraped shortcuts
- **On-Demand Scraping**: AI-powered scraping for long-tail applications
- **Community Contributions**: Core database enhanced by community via GitHub

## 📚 Documentation

For detailed documentation, see:

- **[API Documentation](docs/api/index.html)** - Complete TypeDoc-generated API reference for the core package
- [DEVELOPMENT_PRIORITIES.md](DEVELOPMENT_PRIORITIES.md) - Development roadmap and priorities
- [katasumi-plan.md](katasumi-plan.md) - Detailed project planning

## 🛠️ Development

This project is currently in early development. See the documentation links above for more details.

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific package
npm test --workspace=@katasumi/core
npm test --workspace=@katasumi/tui
npm test --workspace=@katasumi/web
```

### Type Checking

```bash
# Type check all packages
npm run typecheck

# Type check specific package
npm run typecheck --workspace=@katasumi/core
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and commit (`git commit -m 'Add amazing feature'`)
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- All tests pass (`npm test`)
- Code is properly typed (`npm run typecheck`)
- Follow the existing code style
- Add tests for new features

For major changes, please open an issue first to discuss what you would like to change.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Josh Pitkin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**Katasumi** - Always there in your corner, ready to help. 隅
