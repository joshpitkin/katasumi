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
  - [Quick Install (TUI)](#quick-install-tui)
- [Database Strategy](#-database-strategy)
- [Documentation](#-documentation)
- [Development](#️-development)
- [Contributing](#-contributing)
  - [Development Environment Setup](#development-environment-setup)
  - [Development Workflow](#development-workflow)
  - [Testing & Running](#testing--running)
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

### Premium vs Free Tier

**Premium Features** (require account + subscription):
- 🔄 Multi-device sync for shortcuts and collections
- 🤖 Built-in AI search (no API key needed)
- ☁️ Cloud storage for user shortcuts
- 🎯 Unlimited AI queries

**Free Features** (no account needed):
- 🔍 Full keyword search functionality
- 💻 Local-only TUI usage
- 🤖 AI search with your own API key
- 📝 Local shortcut creation and editing

#### Setting Up AI for Free Users

Free tier users can use AI-powered search by providing their own API key:

**TUI (Terminal Interface):**
1. Create/edit `~/.katasumi/config.json`:
```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "your-api-key-here",
    "model": "gpt-4"
  }
}
```

**Web Interface:**
- Include `userApiKey` and `aiProvider` in your API requests to `/api/ai`
- Supported providers: `openai`, `anthropic`, `openrouter`, `ollama`

Premium users can use built-in AI without any configuration.

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

### Quick Install (TUI)

Install Katasumi globally for instant access from any terminal:

```bash
npm install -g katasumi
```

Then launch it with:

```bash
katasumi
```

**Note:** Global installation is not yet available as the package has not been published to npm. For development and contribution setup, see the [Contributing](#-contributing) section below.

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
- **[KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md)** - Comprehensive keyboard navigation guide and implementation details
- [DEVELOPMENT_PRIORITIES.md](DEVELOPMENT_PRIORITIES.md) - Development roadmap and priorities
- [katasumi-plan.md](katasumi-plan.md) - Detailed project planning

## 🛠️ Development

This project is currently in early development. We use a monorepo structure with Turborepo for efficient builds and development.

### Tech Stack

- **TypeScript** - Type-safe code across all packages
- **Prisma** - Database ORM with SQLite and PostgreSQL support
- **Ink** - React for terminal UIs (TUI)
- **Next.js** - React framework for web application
- **Turborepo** - Monorepo build system

## 🤝 Contributing

We welcome contributions from developers of all skill levels! Whether you're fixing a bug, adding a feature, improving documentation, or suggesting ideas, your help is appreciated.

**Quick Links:**
- [CONTRIBUTING.md](CONTRIBUTING.md) - Comprehensive contribution guide
- [DEVELOPMENT.md](DEVELOPMENT.md) - Detailed development setup and troubleshooting
- [GitHub Issues](https://github.com/joshpitkin/katasumi/issues) - Report bugs or request features
- [GitHub Discussions](https://github.com/joshpitkin/katasumi/discussions) - Ask questions and share ideas

### Development Environment Setup

#### Prerequisites

- Node.js 18+ and npm (or pnpm)
- Docker and Docker Compose (recommended)
- OR PostgreSQL 14+ (if not using Docker)

#### Quick Setup (Automated)

For the fastest setup, use our automated script:

```bash
git clone https://github.com/joshpitkin/katasumi.git
cd katasumi
./quick-setup.sh
```

This script will:
- Start PostgreSQL via Docker (if available)
- Copy environment configuration files
- Install dependencies
- Build and seed both SQLite (TUI) and PostgreSQL (Web) databases

#### Manual Setup

1. **Clone and install:**
   ```bash
   git clone https://github.com/joshpitkin/katasumi.git
   cd katasumi
   pnpm install
   ```

2. **Start PostgreSQL:**
   ```bash
   docker-compose up -d  # Using Docker
   # OR see DEVELOPMENT.md for manual PostgreSQL installation
   ```

3. **Configure environment:**
   ```bash
   cp packages/core/.env.example packages/core/.env
   cp packages/web/.env.example packages/web/.env.local
   ```

4. **Build and seed databases:**
   ```bash
   pnpm run setup:tui  # SQLite for TUI
   
   # PostgreSQL for Web
   cd packages/core
   DATABASE_URL="postgres://katasumi:dev_password@localhost:5432/katasumi_dev" DB_TYPE="postgres" pnpm run migrate
   DATABASE_URL="postgres://katasumi:dev_password@localhost:5432/katasumi_dev" pnpm run seed
   cd ../..
   ```

5. **Start development:**
   ```bash
   pnpm run dev  # Starts both TUI and Web
   ```

For detailed instructions and troubleshooting, see [DEVELOPMENT.md](DEVELOPMENT.md).

### Development Workflow

**Working on different packages:**

```bash
# Core package (shared logic)
pnpm run build --workspace=@katasumi/core

# TUI (terminal interface)
pnpm run dev --workspace=@katasumi/tui
pnpm run start:tui  # Test the TUI

# Web (Next.js app)
pnpm run dev --workspace=@katasumi/web
# Visit http://localhost:3000
```

**Database operations:**

```bash
pnpm run migrate:status      # Check migration status
pnpm run migrate:rollback    # Rollback last migration
pnpm run seed                # Re-seed database
pnpm run build-db            # Rebuild TUI database
```

### Testing & Running

**Run tests:**
```bash
pnpm test                              # All tests
pnpm test --workspace=@katasumi/core  # Specific package
pnpm test -- --watch                   # Watch mode
```

**Type checking:**
```bash
pnpm run typecheck                         # All packages
pnpm run typecheck --workspace=@katasumi/core  # Specific package
```

**Test applications:**
```bash
pnpm run start:tui   # Test TUI interactively
pnpm run start:web   # Start web app (http://localhost:3000)
```

### How to Contribute

1. **Fork** the repository to your GitHub account
2. **Clone** your fork locally
3. **Create a branch** for your changes: `git checkout -b feature/my-feature`
4. **Make your changes** with clear, atomic commits
5. **Test thoroughly** - run `pnpm test` and `pnpm run typecheck`
6. **Push** to your fork: `git push origin feature/my-feature`
7. **Open a Pull Request** with a clear description

**Before submitting:**
- ✅ All tests pass (`pnpm test`)
- ✅ Code is properly typed (`pnpm run typecheck`)
- ✅ Documentation is updated if needed
- ✅ Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)

For more details, see [CONTRIBUTING.md](CONTRIBUTING.md).

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
