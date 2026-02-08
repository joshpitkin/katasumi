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
- [AI Setup for Free Users](#-ai-setup-for-free-users)
  - [Getting Your API Key](#getting-your-api-key)
  - [Configuration Methods](#configuration-methods)
  - [Configuration Examples](#configuration-examples)
  - [Troubleshooting](#troubleshooting)
  - [Security Best Practices](#-security-best-practices)
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

## 🤖 AI Setup for Free Users

Free tier users can access AI-powered shortcut search by configuring their personal API key. Premium users enjoy built-in AI with no setup required.

**💰 Cost Estimate:** Typical usage costs **$0.50-$2/month** with a personal API key, depending on your search frequency.

### Getting Your API Key

Choose one of these AI providers:

| Provider | Get API Key | Pricing |
|----------|-------------|---------|
| **OpenAI** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | [View Pricing](https://openai.com/pricing) |
| **Anthropic (Claude)** | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) | [View Pricing](https://www.anthropic.com/pricing) |
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) | [View Pricing](https://openrouter.ai/docs#models) |
| **Ollama** | [Run locally](https://ollama.ai/) | Free (runs on your machine) |

### Configuration Methods

#### Method 1: Config File (Recommended)

1. Create the configuration directory:
   ```bash
   mkdir -p ~/.katasumi
   ```

2. Create `~/.katasumi/config.json`:
   ```json
   {
     "ai": {
       "provider": "openai",
       "apiKey": "sk-your-api-key-here",
       "model": "gpt-4"
     }
   }
   ```

3. Launch Katasumi and press **F4** or **'a'** to toggle AI search mode

#### Method 2: Environment Variables

Set environment variables before running Katasumi:

```bash
export KATASUMI_AI_PROVIDER=openai
export KATASUMI_AI_KEY=sk-your-api-key-here
export KATASUMI_AI_MODEL=gpt-4

# Optional: Custom API endpoint
export KATASUMI_AI_BASE_URL=https://api.openai.com/v1
```

Then launch Katasumi as usual:
```bash
katasumi
```

#### Method 3: TUI Command (Interactive)

Launch Katasumi and use the config command:

```bash
katasumi config set ai.provider openai
katasumi config set ai.apiKey sk-your-api-key-here
katasumi config set ai.model gpt-4
```

### Configuration Examples

#### OpenAI (GPT-4)
```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4",
    "baseUrl": "https://api.openai.com/v1"
  }
}
```

#### Anthropic (Claude)
```json
{
  "ai": {
    "provider": "anthropic",
    "apiKey": "sk-ant-...",
    "model": "claude-3-opus-20240229"
  }
}
```

#### OpenRouter (Multiple Models)
```json
{
  "ai": {
    "provider": "openrouter",
    "apiKey": "sk-or-...",
    "model": "anthropic/claude-3-opus",
    "baseUrl": "https://openrouter.ai/api/v1"
  }
}
```

#### Ollama (Local)
```json
{
  "ai": {
    "provider": "ollama",
    "model": "llama2",
    "baseUrl": "http://localhost:11434/v1"
  }
}
```
*Note: Ollama runs locally and doesn't require an API key*

### Using AI in the TUI

1. **Launch Katasumi**: `katasumi`
2. **Toggle AI Mode**: Press **F4** or **'a'** key
3. **Search with AI**: Type natural language queries like:
   - "shortcuts for commenting code in vim"
   - "how to split window in tmux"
   - "vscode keyboard shortcuts for debugging"

### Web Interface Usage

For API requests to `/api/ai`, include your API key:

```javascript
fetch('/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "vim shortcuts for navigation",
    userApiKey: "sk-...",
    aiProvider: "openai"
  })
})
```

### Troubleshooting

#### "Invalid API Key" Error
- **Check your API key** is correct and active
- **Verify provider** matches your API key type (OpenAI keys don't work with Anthropic, etc.)
- **Check account billing** - ensure your provider account has billing enabled

#### "Rate Limit Exceeded" Error
- **Wait a few minutes** and try again
- **Upgrade your API plan** with your provider
- **Reduce query frequency** or switch to a different provider

#### AI Toggle Not Working
- **Verify configuration** exists at `~/.katasumi/config.json`
- **Check permissions**: `chmod 600 ~/.katasumi/config.json`
- **Validate JSON syntax** using `jq . ~/.katasumi/config.json`

#### Ollama Connection Issues
- **Start Ollama**: `ollama serve`
- **Pull a model**: `ollama pull llama2`
- **Check baseUrl** points to `http://localhost:11434/v1`

### 🔒 Security Best Practices

⚠️ **Important Security Notes:**

- **Never commit** `config.json` to version control
- **Never share** your API keys publicly or in screenshots
- **Use environment variables** in CI/CD pipelines instead of config files
- **Rotate keys regularly** if you suspect they've been exposed
- **Set spending limits** in your AI provider account settings
- **Use read-only keys** if your provider offers them

### Premium vs Free AI Features

| Feature | Free (Your API Key) | Premium (Built-in) |
|---------|---------------------|-------------------|
| AI Search | ✅ Yes | ✅ Yes |
| Configuration Required | ✅ Yes | ❌ No |
| API Key Management | 👤 You manage | 🏢 We manage |
| Cost | 💵 You pay provider | 💎 Included in subscription |
| Query Limits | Provider-dependent | ♾️ Unlimited |
| Setup Time | ~5 minutes | ⚡ Instant |

---

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
