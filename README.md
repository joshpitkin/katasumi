# Katasumi (隅) - Your Corner Companion for Keyboard Shortcuts

**Katasumi** (カタスミ / 隅) - meaning "in the corner" - is an AI-powered keyboard shortcut discovery tool that stays quietly in the background, ready to help whenever you need it.

Like a helpful friend waiting in the corner of your workspace, Katasumi provides instant access to keyboard shortcuts across terminal and desktop applications, supporting you without getting in the way.

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

3. **Build the core package (required before first run):**
   ```bash
   npm run build
   ```
   
   This step generates Prisma clients and compiles TypeScript. It's required before running `npm run dev` for the first time.

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
- Test the TUI by running: `node packages/tui/dist/index.js`

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

### First-Time Setup Notes

The build step is crucial on first setup as it:
- Generates Prisma clients for both SQLite and PostgreSQL
- Compiles TypeScript to ensure type definitions are available
- Creates necessary generated files in the `packages/core/src/generated` directory

If you encounter type errors when running `npm run dev`, make sure you've run `npm run build` first.

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

## 🛠️ Development

This project is currently in early development. See [DEVELOPMENT_PRIORITIES.md](DEVELOPMENT_PRIORITIES.md) for the development roadmap and [katasumi-plan.md](katasumi-plan.md) for detailed project planning.

## 📝 License

TBD

## 🤝 Contributing

Contributions welcome! More details coming soon.

---

**Katasumi** - Always there in your corner, ready to help. 隅
