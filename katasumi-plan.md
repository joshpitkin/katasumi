# Katasumi - Project Plan

AI-powered keyboard shortcut discovery tool for terminal and desktop applications. Share core search logic between TUI and web interfaces.

## Architecture Overview

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

## Tech Stack

### Core (Shared)
- **Language**: TypeScript
- **Database ORM**: Prisma (unified schema for SQLite + PostgreSQL)
- **Search**: Keyword (fzf-like fuzzy) + Optional AI (OpenAI/Claude/Ollama)
- **Scraping**: Cheerio (static HTML), Puppeteer (dynamic), possibly scrapy for complex cases
- **Storage**: SQLite (TUI) + PostgreSQL (Web) - see Database Strategy below

### TUI
- **Framework**: TBD - Need to evaluate Ink vs. simpler alternatives
- **Key Libraries**: 
  - fzf/fuzzy search implementation
  - Terminal UI primitives
  - Minimal dependencies for speed

### Web
- **Framework**: Next.js (React) + Vercel
- **API Routes**: AI queries, search endpoint
- **UI**: Tailwind CSS for styling
- **Monetization**: Optional premium tier (managed API keys)

## Development Phases

### Phase 1: Core Engine & Data Strategy (Week 1-2)

**Goal**: Decide on data architecture and build search foundation

#### 1.1 Database Strategy - HYBRID APPROACH (DECIDED)

**Decision**: Hybrid approach with different storage strategies per deployment mode

**Architecture**:
```
Core shortcuts DB (curated) + On-demand scraping + Local cache

- Ship TUI with embedded SQLite of popular apps (vim, tmux, vscode, etc.)
- Cache scraped results locally (~/.katasumi/cache/)
- Background update check (weekly) for core DB
- On-demand AI scraping for long-tail apps
- Community can contribute to core DB via GitHub
```

**Storage Strategy by Mode**:

**TUI (Local)**:
```
Database: SQLite
Location: 
  - Core DB: ~/.katasumi/shortcuts.db (bundled, read-only)
  - Cache DB: ~/.katasumi/cache.db (user-scraped, read-write)
  - Config: ~/.katasumi/config.json (API keys, preferences)

Pros:
- Zero-config setup (just npm install -g)
- Works 100% offline for core apps
- No server dependencies
- Fast local queries (<10ms)
- Portable (single binary + DB file)

Update Strategy:
- Check for updates on startup (opt-out)
- Download latest shortcuts.db from GitHub releases
- Merge with local cache.db
```

**Web (Free Tier)**:
```
Database: PostgreSQL (Supabase/Vercel Postgres)
Mode: Shared read-only DB

Data:
- Core shortcuts (same as TUI bundle)
- Popular community-scraped shortcuts
- No user-specific data (stateless)

Queries:
- Keyword search: Direct SQL queries
- AI search: 5 queries/day limit (rate-limited by IP)
```

**Web (Premium Tier)**:
```
Database: PostgreSQL + Redis cache

Data:
- All core shortcuts
- User-specific scraped shortcuts (private to account)
- Query history
- Custom collections

Features:
- Unlimited AI queries (managed API key)
- Save custom shortcuts
- Export/import
- Team sharing (SQLite per team)
```

**SQLite vs PostgreSQL Decision Matrix**:

| Aspect | SQLite | PostgreSQL |
|--------|---------|------------|
| TUI | ✅ Perfect (embedded, portable) | ❌ Overkill (needs server) |
| Web Free | ❌ Hard to scale reads | ✅ Better for concurrent users |
| Web Premium | ❌ Can't share data | ✅ Multi-tenant support |
| Offline Mode | ✅ Native | ❌ Requires sync |
| Setup Cost | ✅ Free | ⚠️ Hosting cost (~$0-25/mo) |
| Query Speed | ✅ <10ms local | ⚠️ 20-50ms network |
| Scaling | ⚠️ Single-writer limit | ✅ Handles many writes |

**Recommendation**:
- **TUI**: SQLite only (core + cache)
- **Web Free**: PostgreSQL (shared, read-only)
- **Web Premium**: PostgreSQL + Redis
- **Sync**: TUI can export to web (upload cache.db shortcuts)

---

#### 1.1.1 Multi-Tier Architecture & User Account Strategy

**Problem Statement**: Premium users need their custom shortcuts, collections, and preferences available across both TUI and Web interfaces. However, TUI uses SQLite (offline-first) and Web uses PostgreSQL (cloud-hosted). How do we sync data between these two systems while maintaining the TUI's offline capabilities?

**Proposed Solution: Hybrid Sync Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloud (PostgreSQL)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Premium User Account Database                       │  │
│  │  - User auth & profile                               │  │
│  │  - Custom shortcuts (user-added)                     │  │
│  │  - Collections & favorites                           │  │
│  │  - Sync metadata (last_sync, conflict_resolution)    │  │
│  │  - API usage tracking                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↕                                  │
│                    REST API / GraphQL                        │
│                  (Authentication via JWT)                    │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   Local TUI (SQLite)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  shortcuts.db (bundled, read-only)                   │  │
│  │  - Core shortcuts for popular apps                   │  │
│  │  - Updated via GitHub releases                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  user-data.db (local, read-write)                    │  │
│  │  - User-scraped shortcuts                            │  │
│  │  - Custom shortcuts                                  │  │
│  │  - Collections                                       │  │
│  │  - Sync metadata (conflicts, pending changes)       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  config.json                                         │  │
│  │  - API token (for premium users)                    │  │
│  │  - Sync preferences                                  │  │
│  │  - Last sync timestamp                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Tier Breakdown**:

**Free Tier (Web & TUI)**:
- **Web**: Read-only access to core shortcuts via PostgreSQL
- **TUI**: Full offline access to bundled shortcuts.db + local cache
- **No Account Required**: Anonymous usage
- **Rate Limits**: 5 AI searches per day (IP-based)
- **No Sync**: TUI and Web are independent

**Premium Tier ($5-10/month)**:
- **Account Required**: Email/OAuth login
- **Cloud Storage**: PostgreSQL stores user's custom shortcuts & collections
- **Unlimited AI**: No rate limits on AI scraping
- **Cross-Platform Sync**: TUI ↔ Web bidirectional sync
- **Features**:
  - Save custom shortcuts
  - Create collections/folders
  - Tag and organize shortcuts
  - Export/import (CSV, JSON)
  - Priority support

**Team Tier ($20-50/month)** (Future):
- All Premium features
- Shared team collections
- Role-based access control
- Admin dashboard
- Usage analytics

**Sync Strategy Details**:

**How TUI Authenticates**:
```bash
# One-time setup
$ katasumi login
? Enter your email: user@example.com
? Enter your password: ••••••••
✓ Logged in successfully
✓ API token saved to ~/.katasumi/config.json

# Or via web OAuth flow
$ katasumi login --web
→ Opens browser to auth page
✓ Token received and saved
```

**Sync Process (TUI → Cloud)**:
1. User adds/modifies shortcuts in TUI (stored in user-data.db)
2. On next sync (manual or automatic):
   - TUI compares local user-data.db with last sync timestamp
   - Sends changed records to API: `POST /api/sync/push`
   - API validates user token and writes to PostgreSQL
   - Returns latest cloud timestamp

**Sync Process (Cloud → TUI)**:
1. User modifies shortcuts on Web (written to PostgreSQL)
2. TUI initiates sync: `GET /api/sync/pull?since=<timestamp>`
3. API returns shortcuts modified since last sync
4. TUI merges changes into user-data.db

**Conflict Resolution**:
```typescript
// When same shortcut modified in both places
enum ConflictStrategy {
  LOCAL_WINS = 'local',      // Keep TUI version
  REMOTE_WINS = 'remote',    // Keep Cloud version
  NEWEST_WINS = 'newest',    // Keep most recently modified (default)
  MERGE = 'merge',           // Attempt intelligent merge
  MANUAL = 'manual'          // Prompt user
}

// User configures preference
// ~/.katasumi/config.json
{
  "sync": {
    "enabled": true,
    "auto": true,              // Auto-sync on startup
    "interval": "hourly",       // or "manual"
    "conflictStrategy": "newest"
  }
}
```

**Data Partitioning**:
- **Core Shortcuts**: Read-only, same for all users (shortcuts.db)
- **User Shortcuts**: User-owned, synced via API (user-data.db ↔ PostgreSQL)
- **Cached Scraped Shortcuts**: Stored locally only (optional cloud upload)

**API Endpoints**:
```typescript
// Sync endpoints
POST /api/sync/push           // Upload local changes
GET  /api/sync/pull           // Download remote changes
GET  /api/sync/status         // Check sync state

// User data endpoints
GET    /api/shortcuts         // List user's shortcuts
POST   /api/shortcuts         // Create shortcut
PUT    /api/shortcuts/:id     // Update shortcut
DELETE /api/shortcuts/:id     // Delete shortcut

// Collections
GET    /api/collections
POST   /api/collections
PUT    /api/collections/:id
DELETE /api/collections/:id

// Authentication
POST /api/auth/login          // Email/password
POST /api/auth/oauth          // OAuth (Google, GitHub)
POST /api/auth/refresh        // Refresh JWT token
POST /api/auth/logout         // Invalidate token
```

**Database Schema (PostgreSQL)**:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  tier VARCHAR(50) DEFAULT 'free', -- 'free', 'premium', 'team'
  api_token_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User shortcuts (custom)
CREATE TABLE user_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  app VARCHAR(100) NOT NULL,
  action VARCHAR(500) NOT NULL,
  description TEXT,
  keys_mac VARCHAR(100),
  keys_windows VARCHAR(100),
  keys_linux VARCHAR(100),
  context VARCHAR(100),
  category VARCHAR(100),
  tags TEXT[], -- PostgreSQL array
  source_type VARCHAR(50) DEFAULT 'user-added',
  source_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Sync metadata
  synced_at TIMESTAMP,
  conflict_version INTEGER DEFAULT 1
);

CREATE INDEX idx_user_shortcuts_user ON user_shortcuts(user_id);
CREATE INDEX idx_user_shortcuts_app ON user_shortcuts(app);
CREATE INDEX idx_user_shortcuts_updated ON user_shortcuts(updated_at);

-- Collections
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Collection shortcuts (junction table)
CREATE TABLE collection_shortcuts (
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  shortcut_id UUID REFERENCES user_shortcuts(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (collection_id, shortcut_id)
);

-- Sync log (for debugging)
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50), -- 'push', 'pull'
  records_affected INTEGER,
  conflicts_resolved INTEGER,
  status VARCHAR(50), -- 'success', 'partial', 'error'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Advantages of This Approach**:

✅ **Offline-First TUI**: Works 100% offline with bundled + local DB
✅ **Premium Value**: Cloud sync is a clear premium feature
✅ **Performance**: Local SQLite queries remain fast (<10ms)
✅ **Scalability**: PostgreSQL handles concurrent web users
✅ **Flexibility**: Users can choose TUI-only, Web-only, or both
✅ **Data Ownership**: Users can export their data anytime
✅ **Cost-Effective**: Free tier has no DB writes (saves hosting costs)

**Challenges & Solutions**:

❗ **Challenge**: Keeping SQLite schema in sync with PostgreSQL
✅ **Solution**: Prisma with unified schema.prisma file + generator for both databases

❗ **Challenge**: Large sync payload for users with many shortcuts
✅ **Solution**: Incremental sync (only changes since last sync) + pagination

❗ **Challenge**: Offline edits in TUI while user also edits on Web
✅ **Solution**: Conflict detection + user-configurable resolution strategy

❗ **Challenge**: TUI needs to securely store API token
✅ **Solution**: Store in ~/.katasumi/config.json with 600 permissions

**Monetization Considerations**:

1. **Free Tier is Generous**: Encourages adoption
2. **Premium is Value-Add**: Sync + unlimited AI is worth $5-10/mo
3. **Team Tier**: Larger customers willing to pay more
4. **Avoid Freemium Trap**: Don't make free tier too good
5. **Usage-Based Alternative**: Consider per-query pricing for AI features

**Implementation Priority**:

Phase 1 (MVP):
- [ ] Core SQLite DB (TUI)
- [ ] PostgreSQL schema (Web)
- [ ] Basic user auth
- [ ] Free tier (no sync)

Phase 2 (Premium):
- [ ] User shortcuts table
- [ ] Sync API endpoints
- [ ] TUI login command
- [ ] Bidirectional sync

Phase 3 (Polish):
- [ ] Conflict resolution
- [ ] Collections feature
- [ ] Team tier
- [ ] Export/import

---

**Implementation Plan with Prisma**:
```typescript
// core/prisma/schema.prisma
// Unified schema for both SQLite and PostgreSQL
generator client {
  provider = "prisma-client-js"
}

// Use conditional datasource for different environments
datasource db {
  provider = "sqlite"  // or "postgresql" for web
  url      = env("DATABASE_URL")
}

model Shortcut {
  id            String   @id @default(uuid())
  app           String
  action        String
  description   String?
  keysMac       String?  @map("keys_mac")
  keysWindows   String?  @map("keys_windows")
  keysLinux     String?  @map("keys_linux")
  context       String?
  category      String?
  tags          String[] // PostgreSQL array or JSON in SQLite
  sourceType    String   @map("source_type")
  sourceUrl     String   @map("source_url")
  popularity    Float?
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([app])
  @@index([category])
  @@map("shortcuts")
}

model AppInfo {
  id            String   @id
  name          String
  displayName   String   @map("display_name")
  category      String
  platforms     String[] // JSON array
  icon          String?
  homepage      String?
  docsUrl       String?  @map("docs_url")
  shortcutCount Int      @map("shortcut_count")

  @@map("app_info")
}

// For web (PostgreSQL only)
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String?
  tier         String   @default("free")
  apiTokenHash String?  @map("api_token_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  shortcuts    UserShortcut[]
  collections  Collection[]
  syncLogs     SyncLog[]

  @@map("users")
}

model UserShortcut {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  app             String
  action          String
  description     String?
  keysMac         String?  @map("keys_mac")
  keysWindows     String?  @map("keys_windows")
  keysLinux       String?  @map("keys_linux")
  context         String?
  category        String?
  tags            String[]
  sourceType      String   @map("source_type")
  sourceUrl       String?  @map("source_url")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  syncedAt        DateTime? @map("synced_at")
  conflictVersion Int      @default(1) @map("conflict_version")

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([app])
  @@index([updatedAt])
  @@map("user_shortcuts")
}

model Collection {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  name        String
  description String?
  isPublic    Boolean  @default(false) @map("is_public")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  shortcuts   CollectionShortcut[]

  @@map("collections")
}

model CollectionShortcut {
  collectionId String   @map("collection_id")
  shortcutId   String   @map("shortcut_id")
  addedAt      DateTime @default(now()) @map("added_at")

  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  @@id([collectionId, shortcutId])
  @@map("collection_shortcuts")
}

model SyncLog {
  id               String   @id @default(uuid())
  userId           String   @map("user_id")
  action           String
  recordsAffected  Int      @map("records_affected")
  conflictsResolved Int     @map("conflicts_resolved")
  status           String
  errorMessage     String?  @map("error_message")
  createdAt        DateTime @default(now()) @map("created_at")

  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sync_logs")
}

// core/src/db/index.ts
import { PrismaClient } from '@prisma/client';

export interface DatabaseAdapter {
  search(query: string, filters?: Filter): Promise<Shortcut[]>;
  insert(shortcut: Shortcut): Promise<void>;
  update(id: string, shortcut: Partial<Shortcut>): Promise<void>;
}

export class PrismaAdapter implements DatabaseAdapter {
  private prisma: PrismaClient;

  constructor(databaseUrl: string) {
    this.prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } }
    });
  }

  async search(query: string, filters?: Filter): Promise<Shortcut[]> {
    return this.prisma.shortcut.findMany({
      where: {
        app: filters?.app,
        category: filters?.category,
        OR: [
          { action: { contains: query } },
          { description: { contains: query } },
          { tags: { hasSome: [query] } }
        ]
      }
    });
  }

  // Additional methods...
}

// Usage in TUI (SQLite)
const tuiDb = new PrismaAdapter('file:~/.katasumi/shortcuts.db');

// Usage in Web (PostgreSQL)
const webDb = new PrismaAdapter(process.env.DATABASE_URL);
```

**Prisma Benefits**:
✅ Single schema.prisma defines structure for both databases
✅ Type-safe database queries with autocomplete
✅ Automatic migrations with `prisma migrate`
✅ Supports both SQLite (TUI) and PostgreSQL (Web)
✅ Introspection and seeding capabilities
✅ Works seamlessly with TypeScript types

#### 1.2 Search Engine Implementation

**Unified Schema Design**:

```typescript
// core/src/types/shortcut.ts
export type Platform = 'mac' | 'windows' | 'linux';
export type SourceType = 'official' | 'community' | 'ai-scraped' | 'user-added';

export interface Shortcut {
  // Identity
  id: string;                    // UUID
  app: string;                   // 'vim', 'vscode', 'tmux'
  appVersion?: string;           // '2.0', '1.85.0' (optional)
  
  // Core data
  action: string;                // 'Move cursor left', 'Open file'
  description?: string;          // Longer explanation
  
  // Keybindings
  keys: {
    mac?: string;                // '⌘K', 'Cmd+K'
    windows?: string;            // 'Ctrl+K'
    linux?: string;              // 'Ctrl+K'
  };
  
  // Context & categorization
  context?: string;              // 'Normal Mode', 'Editor Focus', 'Git Panel'
  category?: string;             // 'Navigation', 'Editing', 'Window Management'
  tags: string[];                // ['cursor', 'movement', 'vim-motion']
  
  // Metadata
  source: {
    type: SourceType;
    url: string;                 // Documentation URL
    scrapedAt?: Date;            // When it was scraped
    confidence?: number;         // 0-1 for AI-scraped shortcuts
  };
  
  // Search optimization
  searchTerms: string[];         // Pre-computed for fuzzy search
  popularity?: number;           // Usage frequency (0-1)
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface AppInfo {
  id: string;                    // 'vim'
  name: string;                  // 'Vim'
  displayName: string;           // 'Vim - Vi IMproved'
  category: string;              // 'Editor', 'Terminal', 'Browser'
  platforms: Platform[];         // ['mac', 'linux', 'windows']
  icon?: string;                 // URL or emoji
  homepage?: string;
  docsUrl?: string;
  shortcutCount: number;         // Number of shortcuts in DB
}
```

**Keyword Search (Default/Free)**
```typescript
// core/src/search/keyword.ts
export interface SearchOptions {
  app?: string;                  // Filter by app
  platform?: Platform;           // Filter by platform
  category?: string;             // Filter by category
  maxResults?: number;           // Default 50
  fuzzyThreshold?: number;       // 0-1, default 0.6
}

export class KeywordSearchEngine {
  constructor(db: DatabaseAdapter);
  
  // Fuzzy search across action, tags, searchTerms
  fuzzySearch(query: string, options?: SearchOptions): Promise<Shortcut[]>;
  
  // Exact keypress match (e.g., search for 'Ctrl+K')
  searchByKeys(keys: string, platform?: Platform): Promise<Shortcut[]>;
  
  // List all shortcuts for an app
  listByApp(app: string, platform?: Platform): Promise<Shortcut[]>;
  
  // Search by category
  searchByCategory(category: string): Promise<Shortcut[]>;
}

// Search ranking algorithm:
// 1. Exact action match (score: 1.0)
// 2. Action starts with query (score: 0.8)
// 3. Tag exact match (score: 0.7)
// 4. Fuzzy match in action (score: 0.3-0.6)
// 5. Fuzzy match in searchTerms (score: 0.2-0.4)
// 6. Boost by popularity (multiply by popularity score)
```

**AI Search (Optional/BYOK)**
```typescript
// core/src/search/ai.ts
export type AIProviderType = 'openai' | 'anthropic' | 'ollama';

export interface AIProviderConfig {
  type: AIProviderType;
  apiKey?: string;               // Not needed for Ollama
  model?: string;                // 'gpt-4', 'claude-3-sonnet'
  baseUrl?: string;              // For Ollama: http://localhost:11434
}

export interface AISearchContext {
  app?: string;                  // Current app context
  platform: Platform;            // User's OS
  recentActions?: string[];      // Recently used shortcuts
}

export class AISearchEngine {
  constructor(config: AIProviderConfig, db: DatabaseAdapter);
  
  // Natural language search
  // Example: "how do I split window vertically in tmux"
  async semanticSearch(
    naturalQuery: string, 
    context?: AISearchContext
  ): Promise<Shortcut[]> {
    // 1. Use AI to extract intent & keywords
    // 2. Convert to structured query
    // 3. Search DB with keyword engine
    // 4. If no results, trigger on-demand scraping
    // 5. Re-rank results with AI relevance
  }
  
  // Explain a shortcut in plain English
  async explainShortcut(shortcut: Shortcut): Promise<string>;
  
  // Suggest related shortcuts
  async getSimilar(shortcut: Shortcut): Promise<Shortcut[]>;
  
  // Generate shortcuts from documentation
  async extractFromDocs(url: string, app: string): Promise<Shortcut[]>;
}
```

**Search Flow**:
```
User types: "vim move word"
  ↓
[Keyword Engine]
  - Fuzzy match: 'move', 'word' in action/tags
  - Filter: app='vim'
  - Results: [w, b, e, ge, ...]
  ↓
[Optional: AI Enhancement]
  - Re-rank by semantic relevance
  - Add explanation: "w = word forward"
  - Suggest related: [W, B, E (WORD variants)]
  ↓
[Return to UI]
```

#### 1.3 Scraping Pipeline - HYBRID APPROACH (DECIDED)

**Decision**: Hybrid scheduled + on-demand scraping

**Architecture**:
```
Scheduled Pipeline (Weekly)
  ↓
Top 50 apps → Core DB → GitHub Release
  ↓
TUI/Web downloads on update

On-Demand Pipeline (User-triggered)
  ↓
Long-tail apps → Local cache → Optional: Contribute to core
```

**Scheduled Pipeline (GitHub Actions)**:

```yaml
# .github/workflows/scrape-shortcuts.yml
name: Scrape Shortcuts
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:      # Manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - name: Scrape top 50 apps
        run: npm run scrape:scheduled
      
      - name: Validate shortcuts
        run: npm run validate:shortcuts
      
      - name: Update SQLite DB
        run: npm run db:build
      
      - name: Create GitHub Release
        # Publish shortcuts.db as release asset
```

**Scraping Strategy by Source Type**:

**Type 1: Man Pages (Simple)**
```typescript
// core/src/scrapers/man-page.ts
export class ManPageScraper {
  async scrape(command: string): Promise<Shortcut[]> {
    // 1. Run: man ${command} | col -b
    // 2. Parse sections: KEY BINDINGS, COMMANDS
    // 3. Extract with regex patterns
    // 4. Map to Shortcut schema
  }
}

// Examples: vim, tmux, less, git
// Pattern: "^\s+([a-zA-Z0-9]+)\s+(.+)$"
// Example: "     j       Move down one line"
```

**Type 2: GitHub README (Markdown)**
```typescript
// core/src/scrapers/github.ts
export class GitHubScraper {
  async scrape(repo: string, path?: string): Promise<Shortcut[]> {
    // 1. Fetch README via GitHub API
    // 2. Parse markdown tables
    // 3. Look for patterns:
    //    | Key | Action |
    //    | Ctrl+K | Open file |
  }
}

// Examples: vimium, tmux plugins
```

**Type 3: Web Documentation (HTML)**
```typescript
// core/src/scrapers/web.ts
export class WebScraper {
  async scrape(url: string, selectors: ScraperConfig): Promise<Shortcut[]> {
    // 1. Fetch with Cheerio (static) or Puppeteer (dynamic)
    // 2. Find shortcut elements:
    //    - <kbd> tags
    //    - Tables with 'Shortcut' header
    //    - <code> within specific sections
    // 3. Extract surrounding context
    // 4. Map to schema
  }
}

// Examples: VSCode docs, Obsidian docs, Notion docs
```

**Type 4: Config Files (JSON/YAML)**
```typescript
// core/src/scrapers/config.ts
export class ConfigScraper {
  async scrape(configPath: string): Promise<Shortcut[]> {
    // 1. Parse JSON/YAML
    // 2. Extract keybindings
    // 3. Match with action descriptions
  }
}

// Examples:
// - VSCode: keybindings.json
// - Sublime: Default.sublime-keymap
// - Tmux: .tmux.conf
```

**Type 5: AI-Enhanced Scraping**
```typescript
// core/src/scrapers/ai.ts
export class AIScraper {
  constructor(aiEngine: AISearchEngine);
  
  async scrape(url: string, app: string): Promise<Shortcut[]> {
    // 1. Fetch page HTML
    // 2. Send to AI with prompt:
    //    "Extract keyboard shortcuts from this documentation.
    //     Return as JSON array with keys: action, keys (mac/win/linux)"
    // 3. Parse AI response
    // 4. Validate & normalize
    // 5. Mark as confidence < 1.0 (needs review)
  }
}

// Fallback for complex/unstructured docs
// Used in on-demand scraping
```

**Scraper Registry**:
```typescript
// core/src/scrapers/registry.ts
export interface ScraperConfig {
  app: string;
  type: 'man' | 'github' | 'web' | 'config' | 'ai';
  source: string;              // URL, command, or file path
  selectors?: Record<string, string>; // For web scraping
  parser?: string;             // Custom parser name
}

// registry.json
{
  "vim": {
    "type": "man",
    "source": "vim"
  },
  "vscode": {
    "type": "web",
    "source": "https://code.visualstudio.com/docs/getstarted/keybindings",
    "selectors": {
      "table": ".keybindings-table",
      "key": "td.key",
      "action": "td.command"
    }
  },
  "tmux": {
    "type": "man",
    "source": "tmux"
  }
}
```

**On-Demand Scraping Flow**:
```
User searches: "notion shortcuts"
  ↓
[Check Core DB] → Not found
  ↓
[Check Cache DB] → Not found
  ↓
[Trigger On-Demand Scrape]
  1. Look up scraper config for 'notion'
  2. If config exists: Use configured scraper
  3. If not: Prompt user for docs URL → Use AI scraper
  4. Extract shortcuts
  5. Save to cache.db
  6. (Optional) Prompt user: "Contribute to core DB?"
  ↓
[Return Results]
```

**Quality Control**:
```typescript
// Validation rules
export interface ValidationRule {
  name: string;
  check: (shortcut: Shortcut) => boolean;
  severity: 'error' | 'warning';
}

const rules: ValidationRule[] = [
  {
    name: 'has-action',
    check: (s) => s.action?.length > 0,
    severity: 'error'
  },
  {
    name: 'has-keys',
    check: (s) => Object.keys(s.keys).length > 0,
    severity: 'error'
  },
  {
    name: 'valid-key-format',
    check: (s) => /^[A-Za-z0-9+⌘⇧⌥⌃]+$/.test(s.keys.mac || ''),
    severity: 'warning'
  },
  {
    name: 'has-source',
    check: (s) => isValidUrl(s.source.url),
    severity: 'warning'
  }
];
```

**Performance Targets**:
- Scheduled scrape: Complete top 50 in <30min
- On-demand scrape: Return results in <10sec
- Cache hit rate: >90% for popular apps

### Phase 2: TUI Implementation (Week 2-3)

#### 2.1 UI Framework Decision - INK (DECIDED) ✅

**Decision**: Use Ink (React-based TUI framework)

**Rationale**:
- Component-based architecture (familiar, maintainable)
- Rich ecosystem (ink-select, ink-text-input, ink-spinner)
- Used by production CLIs (GitHub Copilot, Gatsby, Cloudflare)
- Development speed is priority for MVP
- Can optimize later if performance becomes an issue
- ~100ms startup overhead is acceptable for our use case

**Implementation Stack**:
```json
{
  "dependencies": {
    "ink": "^4.0.0",
    "react": "^18.0.0",
    "ink-text-input": "^5.0.0",
    "ink-select-input": "^5.0.0",
    "ink-spinner": "^5.0.0",
    "ink-gradient": "^3.0.0",
    "chalk": "^5.0.0"
  }
}
```

**Performance Baseline**:
- Target startup: <200ms (including React overhead)
- Search latency: <50ms for keyword search
- UI update rate: 60fps (Ink's default)
- Memory footprint: <50MB

#### 2.2 TUI Features & Design (MVP)

**Design Philosophy**: 
- Keyboard-first navigation (zero mouse dependency)
- Muscle memory: Same keybindings work in TUI and Web
- Fast workflow for learning shortcuts for one app at a time
- Support OS/desktop navigation shortcuts alongside app shortcuts
- Minimal cognitive load: Clear visual hierarchy, obvious controls

---

**2.2.1 Search Mode Toggle: App-First vs. Full-Phrase**

The TUI supports **two distinct search modes** to accommodate different user intents:

**Mode 1: App-First Search** (Default)
- User wants to explore shortcuts for a specific app
- Workflow: Select app → Filter by context/category/tags → Browse results
- Best for: "I'm using Vim today and want to learn navigation shortcuts"

**Mode 2: Full-Phrase Search** (AI-Enhanced)
- User has a specific task in mind but may not know which app or shortcut
- Workflow: Type natural language query → Get shortcuts across all apps
- Best for: "How do I split my screen" or "markdown bold text"

**Toggle between modes**: Press `Tab`

**Note on Keyboard Shortcuts**: Katasumi uses vi-style home row navigation:
- `a` - Toggle AI (replaces F4)
- `p` - Platform selector (replaces F5)  
- `g` - Go to app selector/home (replaces F2)
- `f` - Focus filters (replaces F3)
- `/` - Focus search input
- `Ctrl+L` or `Esc` - Clear search
- `Enter` - Submit search

**Keyboard Shortcut Behavior**:

To prevent shortcuts from interfering with typing:

1. **When typing in search input**: Single-key shortcuts (a, p, g, f) are DISABLED
   - You can type normally without triggering actions
   - Modifier shortcuts (Ctrl+K, Ctrl+A) still work (standard browser behavior)
   - Global shortcuts (Tab, ?, Ctrl+C) still work

2. **Special keys that work everywhere**:
   - `/` - Always focuses search input (unless you're already typing)
   - `Esc` - Unfocuses input WITHOUT clearing (so you can use a/p/g/f shortcuts while keeping your search), or closes modal if no input focused
   - `Ctrl+L` - Clears search input and keeps it focused (standard browser shortcut)
   - `Tab` - Always toggles mode (standard form navigation)
   - `Enter` (in search input) - Executes search and unfocuses (so you can navigate results with keyboard)

3. **Implementation** (Web UI):
   ```typescript
   // Check if user is typing before handling shortcuts
   const isTyping = event.target instanceof HTMLInputElement || 
                    event.target instanceof HTMLTextAreaElement;
   
   if (isTyping && !event.ctrlKey && !event.metaKey) {
     return; // Don't handle single-key shortcuts
   }
   ```

4. **Implementation** (TUI):
   - Ink's useInput hook handles this automatically
   - When input component has focus, global shortcuts are blocked
   - Navigation works via arrow keys within input context

> **📖 Complete Implementation Guide**: See [KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md) for comprehensive implementation details, testing checklist, common pitfalls, and full code examples for both Web and TUI.

---

**2.2.2 Mode 1: App-First Search (Detailed Mockup)**

This is the default mode, optimized for focused learning of one app at a time.

```
┌─ Katasumi v1.0 ───────────────────────────────────────────┐
│                                                                   │
│ Mode: [App-First] | Platform: macOS | AI: OFF                   │
│                                                                   │
│ ┌─ Select App ─────────────────────────────────────────────────┐ │
│ │ > vim_                                                        │ │
│ │   ↓ Vim - Vi IMproved (Editor) ................... 342 keys  │ │
│ │     VSCode - Visual Studio Code (Editor) ......... 618 keys  │ │
│ │     vimium - Vim for Browser (Browser) ............ 87 keys  │ │
│ │     macOS - System Shortcuts (OS) ................ 156 keys  │ │
│ │     GNOME - Desktop Environment (OS) .............. 89 keys  │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Navigation: ↑↓ Select | Enter Confirm | Esc Clear | Tab Search   │
└───────────────────────────────────────────────────────────────────┘

                            ↓ User presses Enter ↓

┌─ Katasumi v1.0 ───────────────────────────────────────────┐
│                                                                   │
│ Mode: [App-First] | Platform: macOS | AI: OFF                   │
│ App: Vim (342 shortcuts) | [g] Change App                       │
│                                                                   │
│ ┌─ Filters ─────────────────────────────────────────────────────┐ │
│ │ Context: [All] ▾   Category: [All] ▾   Tags: [none] ▾       │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─ Quick Search ────────────────────────────────────────────────┐ │
│ │ _                                                             │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─ Results (342) ───────────────────────────────────────────────┐ │
│ │ ▸ h/j/k/l        Move left/down/up/right             [Normal] │ │
│ │   w              Move forward to start of word        [Normal] │ │
│ │   b              Move backward to start of word       [Normal] │ │
│ │   e              Move forward to end of word          [Normal] │ │
│ │   gg             Jump to first line                   [Normal] │ │
│ │   G              Jump to last line                    [Normal] │ │
│ │   0              Jump to start of line                [Normal] │ │
│ │   $              Jump to end of line                  [Normal] │ │
│ │   %              Jump to matching bracket             [Normal] │ │
│ │   Ctrl+f         Page down                            [Normal] │ │
│ │   Ctrl+b         Page up                              [Normal] │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Navigation: ↑↓ Select | Enter Details | / Search | f Filters    │
│ Actions: [Ctrl+C] Quit | g Change App | a Toggle AI | p Platform │
└───────────────────────────────────────────────────────────────────┘

                   ↓ User types "nav" in Quick Search ↓

┌─ Katasumi v1.0 ───────────────────────────────────────────┐
│                                                                   │
│ Mode: [App-First] | Platform: macOS | AI: OFF                   │
│ App: Vim (342 shortcuts) | [g] Change App                        │
│                                                                   │
│ ┌─ Filters ─────────────────────────────────────────────────────┐ │
│ │ Context: [All] ▾   Category: [Navigation] ▾   Tags: [none] ▾ │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─ Quick Search ────────────────────────────────────────────────┐ │
│ │ nav_                                                          │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─ Results (28) ────────────────────────────────────────────────┐ │
│ │ ▸ h/j/k/l        Move left/down/up/right             [Normal] │ │
│ │   w              Move forward to start of word        [Normal] │ │
│ │   b              Move backward to start of word       [Normal] │ │
│ │   gg             Jump to first line                   [Normal] │ │
│ │   G              Jump to last line                    [Normal] │ │
│ │   Ctrl+f         Page down                            [Normal] │ │
│ │   Ctrl+b         Page up                              [Normal] │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Navigation: ↑↓ Select | Enter Details | Esc Clear | f Filters   │
│ Actions: [Ctrl+C] Quit | g Change App | a Toggle AI | p Platform │
└───────────────────────────────────────────────────────────────────┘

             ↓ User presses 'f' to focus Filters, then Enter on Context ↓

┌─ Katasumi v1.0 ───────────────────────────────────────────┐
│                                                                   │
│ Mode: [App-First] | Platform: macOS | AI: OFF                   │
│ App: Vim (342 shortcuts) | [g] Change App                        │
│                                                                   │
│ ┌─ Filters ─────────────────────────────────────────────────────┐ │
│ │ Context: [Normal Mode] ▾   Category: [All] ▾   Tags: [none] ▾│ │
│ │   ┌─ Context ──────────────────┐                              │ │
│ │   │ ▸ All                      │                              │ │
│ │   │   Normal Mode (284)        │                              │ │
│ │   │   Insert Mode (42)         │                              │ │
│ │   │   Visual Mode (31)         │                              │ │
│ │   │   Command Mode (18)        │                              │ │
│ │   └────────────────────────────┘                              │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─ Quick Search ────────────────────────────────────────────────┐ │
│ │ nav_                                                          │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─ Results (21) ────────────────────────────────────────────────┐ │
│ │ ▸ h/j/k/l        Move left/down/up/right             [Normal] │ │
│ │   w              Move forward to start of word        [Normal] │ │
│ │   b              Move backward to start of word       [Normal] │ │
│ │   gg             Jump to first line                   [Normal] │ │
│ │   G              Jump to last line                    [Normal] │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Navigation: ↑↓ Select | Enter Confirm | Esc Close Dropdown      │
│ Actions: [Ctrl+C] Quit | g Change App | a Toggle AI | p Platform │
└───────────────────────────────────────────────────────────────────┘

                   ↓ User presses Enter on a shortcut ↓

┌─ Shortcut Details ────────────────────────────────────────────────┐
│                                                                   │
│ App: Vim | Context: Normal Mode | Category: Navigation           │
│                                                                   │
│ ╔═══════════════════════════════════════════════════════════════╗ │
│ ║ Action: Move cursor forward to start of word                 ║ │
│ ║                                                               ║ │
│ ║ Keys:                                                         ║ │
│ ║   macOS:    w                                                ║ │
│ ║   Windows:  w                                                ║ │
│ ║   Linux:    w                                                ║ │
│ ║                                                               ║ │
│ ║ Description:                                                  ║ │
│ ║   Moves the cursor to the beginning of the next word. A      ║ │
│ ║   word consists of letters, digits, and underscores, or a    ║ │
│ ║   sequence of other non-blank characters separated by        ║ │
│ ║   whitespace. Use 'W' for WORD (space-separated).            ║ │
│ ║                                                               ║ │
│ ║ Related Shortcuts:                                            ║ │
│ ║   • b - Move backward to start of word                        ║ │
│ ║   • e - Move forward to end of word                           ║ │
│ ║   • W - Move forward to start of WORD                         ║ │
│ ║                                                               ║ │
│ ║ Tags: cursor, movement, navigation, word                      ║ │
│ ║ Source: vim.org/docs (Official)                               ║ │
│ ╚═══════════════════════════════════════════════════════════════╝ │
│                                                                   │
│ [Esc] Back to Results | [c] Copy Keys | [o] Open Docs           │
└───────────────────────────────────────────────────────────────────┘
```

**Key Features in App-First Mode**:

1. **Two-Stage Selection**:
   - Stage 1: Select app (autocomplete with fuzzy search)
   - Stage 2: Browse/filter shortcuts for that app

2. **Progressive Filtering**:
   - Quick Search: Fuzzy search within current app's shortcuts
   - Context Filter: Filter by mode/context (e.g., "Normal Mode" for Vim)
   - Category Filter: Filter by action type (Navigation, Editing, etc.)
   - Tags Filter: Multi-select tags (cursor, split, window, etc.)

3. **Keyboard Navigation Flow**:
   - `/` or start typing → Focus Quick Search
   - `f` → Focus Filters (Tab through Context/Category/Tags)
   - `↑↓` → Navigate results
   - `Enter` → Show details or confirm selection
   - `Esc` → Go back one level (Clear search → Close filter → Exit app → Quit)
   - `g` → Change app (back to app selector)

4. **OS/Desktop Shortcuts**:
   - Treat OS shortcuts as special "apps" (macOS, Windows, GNOME, KDE, etc.)
   - Allows searching for system shortcuts alongside app shortcuts

---

**2.2.3 Mode 2: Full-Phrase Search (Detailed Mockup)**

This mode uses natural language queries and can leverage AI for better results.

```
┌─ Katasumi v1.0 ───────────────────────────────────────────┐
│                                                                   │
│ Mode: [Full-Phrase] | Platform: macOS | AI: ON                  │
│                                                                   │
│ ┌─ Natural Language Search ─────────────────────────────────────┐ │
│ │ How do I split my screen vertically?_                        │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─ Results (8 shortcuts across 4 apps) ────────────────────────┐ │
│ │ ▸ tmux              Ctrl+b %                        [Pane]   │ │
│ │     Split pane vertically (left/right)                        │ │
│ │                                                               │ │
│ │   VSCode            Cmd+\                           [Layout]  │ │
│ │     Split editor vertically                                   │ │
│ │                                                               │ │
│ │   vim               :vsplit or :vs                  [Window]  │ │
│ │     Split window vertically                                   │ │
│ │                                                               │ │
│ │   macOS             Cmd+Ctrl+F                      [System]  │ │
│ │     Enter full screen / split view                            │ │
│ │                                                               │ │
│ │   Obsidian          Cmd+\                           [Layout]  │ │
│ │     Split pane                                                │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ 💡 AI Insight: Found shortcuts for splitting in 4 apps          │
│                                                                   │
│ Navigation: ↑↓ Select | Enter Details | / New Search            │
│ Actions: [Ctrl+C] Quit | [Tab] Switch to App-First              │
└───────────────────────────────────────────────────────────────────┘

              ↓ User types a more specific query ↓

┌─ Katasumi v1.0 ───────────────────────────────────────────┐
│                                                                   │
│ Mode: [Full-Phrase] | Platform: macOS | AI: ON                  │
│                                                                   │
│ ┌─ Natural Language Search ─────────────────────────────────────┐ │
│ │ markdown make text bold_                                      │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─ Results (6 shortcuts across 3 apps) ────────────────────────┐ │
│ │ ▸ Obsidian          Cmd+B                           [Edit]   │ │
│ │     Toggle bold for selection                                 │ │
│ │                                                               │ │
│ │   VSCode            Cmd+B                           [Edit]    │ │
│ │     Toggle bold (Markdown files)                              │ │
│ │                                                               │ │
│ │   Notion            Cmd+B                           [Edit]    │ │
│ │     Bold text                                                 │ │
│ │                                                               │ │
│ │   Typora            Cmd+B                           [Format]  │ │
│ │     Bold                                                      │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ 💡 AI Insight: Cmd+B is the standard for bold in most MD editors│
│                                                                   │
│ Navigation: ↑↓ Select | Enter Details | / New Search            │
│ Actions: [Ctrl+C] Quit | [Tab] Switch to App-First | [a] AI OFF│
└───────────────────────────────────────────────────────────────────┘

                 ↓ User turns AI off (press 'a') ↓

┌─ Katasumi v1.0 ───────────────────────────────────────────┐
│                                                                   │
│ Mode: [Full-Phrase] | Platform: macOS | AI: OFF                 │
│                                                                   │
│ ┌─ Natural Language Search ─────────────────────────────────────┐ │
│ │ markdown make text bold_                                      │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─ Results (4 shortcuts) ───────────────────────────────────────┐ │
│ │ ▸ Obsidian          Cmd+B                           [Edit]   │ │
│ │     Bold                                                      │ │
│ │                                                               │ │
│ │   Notion            Cmd+B                           [Edit]    │ │
│ │     Bold text                                                 │ │
│ │                                                               │ │
│ │   Typora            Cmd+B                           [Format]  │ │
│ │     Bold                                                      │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ⚡ Keyword search only (no AI). Press a to enable AI search.   │
│                                                                   │
│ Navigation: ↑↓ Select | Enter Details | / New Search            │
│ Actions: [Ctrl+C] Quit | [Tab] Switch to App-First | [a] AI ON │
└───────────────────────────────────────────────────────────────────┘
```

**Key Features in Full-Phrase Mode**:

1. **Natural Language Input**:
   - Type full questions or phrases
   - AI extracts intent and searches across all apps
   - Falls back to keyword search if AI is disabled

2. **Cross-App Results**:
   - Results grouped by app
   - Shows how different apps handle the same task
   - Useful for discovering alternatives

3. **AI Toggle (a)**:
   - ON: Uses AI to understand query and rank results
   - OFF: Falls back to fuzzy keyword search
   - Premium users: unlimited AI queries
   - Free users: limited AI queries, shows remaining count

4. **Simplified Navigation**:
   - No filters needed (AI handles relevance)
   - Focus on query refinement
   - Quick iteration on search terms

---

**2.2.4 Global Features (Both Modes)**

**Platform Selector** (press 'p'):
```
┌─ Platform Selection ─────────────────┐
│ ▸ macOS (current)                   │
│   Windows                            │
│   Linux                              │
│   All Platforms (show all variants) │
└──────────────────────────────────────┘
```

**Settings** (Cmd+, or F6):
```
┌─ Settings ────────────────────────────────────────────┐
│                                                       │
│ General:                                              │
│   Default Mode: [App-First] ▾                        │
│   Default Platform: [macOS] ▾                        │
│   Auto-detect Platform: [ON]                         │
│                                                       │
│ AI Search:                                            │
│   Provider: [OpenAI] ▾                               │
│   API Key: ••••••••••••••••••••••1234                │
│   Model: [gpt-4-turbo] ▾                             │
│                                                       │
│ Sync (Premium):                                       │
│   Auto-sync: [ON]                                    │
│   Sync Interval: [Hourly] ▾                          │
│   Last Sync: 2 hours ago                             │
│   [↻ Sync Now]                                       │
│                                                       │
│ Display:                                              │
│   Result Limit: [50] ▾                               │
│   Show Descriptions: [ON]                            │
│   Compact Mode: [OFF]                                │
│                                                       │
│ [Save] [Cancel]                                      │
└───────────────────────────────────────────────────────┘
```

**Help Overlay** (? key):
```
┌─ Keyboard Shortcuts ──────────────────────────────────┐
│                                                       │
│ Global:                                               │
│   Ctrl+C / q       Quit                              │
│   ?                Show this help                    │
│   Cmd+, / F6       Settings                          │
│   p       Platform selector                 │
│                                                       │
│ Navigation:                                           │
│   ↑↓               Navigate results                  │
│   Enter            Select / Show details             │
│   Esc              Back / Close                      │
│   / or type        Focus search                      │
│                                                       │
│ Search Modes:                                         │
│   Tab              Toggle App-First ↔ Full-Phrase    │
│   g               Change app (App-First mode)       │
│   f               Focus filters (App-First mode)    │
│   a               Toggle AI on/off                  │
│                                                       │
│ Detail View:                                          │
│   c                Copy keys to clipboard            │
│   o                Open documentation URL            │
│                                                       │
│ [Esc] Close Help                                     │
└───────────────────────────────────────────────────────┘
```

---

**2.2.5 Keyboard Navigation Flow Chart**

```
App Launch
    ↓
[Choose Mode: App-First (default) or Full-Phrase (Tab)]
    ↓
┌─────────────────────┴─────────────────────┐
│                                           │
App-First Mode                    Full-Phrase Mode
│                                           │
├─ Select App (autocomplete)      ├─ Type query
│  ↓                               │  ↓
├─ Quick Search (/):               ├─ AI search (a toggle)
│  • Fuzzy filter results          │  ↓
│  • Realtime filtering            ├─ Browse cross-app results
│  ↓                               │  • Grouped by app
├─ Filters (f):                   │  • AI-ranked relevance
│  • Context dropdown              │  ↓
│  • Category dropdown             └─ Select shortcut
│  • Tags multi-select                 ↓
│  ↓                                   Enter for details
├─ Browse Results (↑↓)                 │
│  ↓                                   │
└─ Select shortcut                     │
    ↓                                  │
    Enter for details ─────────────────┘
    │
    ↓
Detail View
    ├─ Read description
    ├─ Copy keys (c)
    ├─ Open docs (o)
    └─ Esc back to results
        │
        └─ Continue browsing or new search
```

---

**2.2.6 Component Architecture (Ink/React)**

```typescript
// tui/src/App.tsx
export default function App() {
  const [mode, setMode] = useState<'app-first' | 'full-phrase'>('app-first');
  const [platform, setPlatform] = useState<Platform>('mac');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [view, setView] = useState<'search' | 'results' | 'detail'>('search');
  
  return (
    <Box flexDirection="column">
      <Header 
        mode={mode} 
        platform={platform} 
        aiEnabled={aiEnabled} 
      />
      
      {mode === 'app-first' ? (
        <AppFirstMode
          platform={platform}
          selectedApp={selectedApp}
          onSelectApp={setSelectedApp}
          view={view}
          onViewChange={setView}
        />
      ) : (
        <FullPhraseMode
          platform={platform}
          aiEnabled={aiEnabled}
          view={view}
          onViewChange={setView}
        />
      )}
      
      <Footer mode={mode} />
      
      <GlobalKeybindings
        onToggleMode={() => setMode(m => m === 'app-first' ? 'full-phrase' : 'app-first')}
        onToggleAI={() => setAiEnabled(a => !a)}
        onOpenSettings={() => {/* ... */}}
        onQuit={() => process.exit(0)}
      />
    </Box>
  );
}

// tui/src/components/AppFirstMode.tsx
export function AppFirstMode({ selectedApp, view, ... }) {
  if (!selectedApp) {
    return <AppSelector onSelect={onSelectApp} />;
  }
  
  if (view === 'search' || view === 'results') {
    return (
      <>
        <Filters app={selectedApp} />
        <QuickSearch />
        <ResultsList app={selectedApp} />
      </>
    );
  }
  
  if (view === 'detail') {
    return <ShortcutDetail />;
  }
}

// tui/src/components/FullPhraseMode.tsx
export function FullPhraseMode({ aiEnabled, view, ... }) {
  if (view === 'search' || view === 'results') {
    return (
      <>
        <NaturalLanguageSearch aiEnabled={aiEnabled} />
        <CrossAppResults />
      </>
    );
  }
  
  if (view === 'detail') {
    return <ShortcutDetail />;
  }
}
```

---

**2.2.7 State Management**

Use **Zustand** (lightweight, works with Ink):

```typescript
// tui/src/store.ts
import create from 'zustand';

interface AppState {
  // UI State
  mode: 'app-first' | 'full-phrase';
  view: 'search' | 'results' | 'detail';
  platform: Platform;
  aiEnabled: boolean;
  
  // Search State
  selectedApp: AppInfo | null;
  query: string;
  filters: {
    context: string | null;
    category: string | null;
    tags: string[];
  };
  results: Shortcut[];
  selectedShortcut: Shortcut | null;
  
  // Actions
  setMode: (mode: 'app-first' | 'full-phrase') => void;
  setView: (view: 'search' | 'results' | 'detail') => void;
  setPlatform: (platform: Platform) => void;
  toggleAI: () => void;
  selectApp: (app: AppInfo | null) => void;
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<AppState['filters']>) => void;
  search: () => Promise<void>;
  selectShortcut: (shortcut: Shortcut) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: 'app-first',
  view: 'search',
  platform: detectPlatform(),
  aiEnabled: false,
  selectedApp: null,
  query: '',
  filters: { context: null, category: null, tags: [] },
  results: [],
  selectedShortcut: null,
  
  setMode: (mode) => set({ mode }),
  setView: (view) => set({ view }),
  setPlatform: (platform) => set({ platform }),
  toggleAI: () => set((state) => ({ aiEnabled: !state.aiEnabled })),
  selectApp: (app) => set({ selectedApp: app }),
  setQuery: (query) => set({ query }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
  
  search: async () => {
    const { mode, query, selectedApp, filters, platform, aiEnabled } = get();
    
    if (mode === 'app-first') {
      const results = await searchEngine.keywordSearch(query, {
        app: selectedApp?.id,
        platform,
        context: filters.context,
        category: filters.category,
        tags: filters.tags,
      });
      set({ results, view: 'results' });
    } else {
      const results = aiEnabled
        ? await searchEngine.aiSearch(query, { platform })
        : await searchEngine.keywordSearch(query, { platform });
      set({ results, view: 'results' });
    }
  },
  
  selectShortcut: (shortcut) => set({ 
    selectedShortcut: shortcut, 
    view: 'detail' 
  }),
}));
```

---

**2.2.8 Performance Targets**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cold start | < 200ms | Time to first render |
| App search | < 50ms | Keystroke to filtered list |
| Keyword search | < 100ms | Query to results displayed |
| AI search | < 2s | Query to results (network dependent) |
| Filter toggle | < 50ms | Click to updated results |
| Memory usage | < 100MB | Steady state |
| DB query | < 10ms | SQLite SELECT |

---

**2.2.9 Accessibility & UX Polish**

- **Clear Focus Indicators**: Highlighted borders, color changes
- **Status Messages**: "Searching...", "No results", "AI limit reached"
- **Error Handling**: Graceful fallbacks, helpful error messages
- **Loading States**: Spinners for async operations
- **Empty States**: Helpful prompts when no app selected or no results
- **Keyboard Hints**: Always visible at bottom (context-aware)
- **Color Scheme**: Support light/dark mode (detect terminal theme)
- **Text Overflow**: Truncate long text with ellipsis, show full in detail view

---

**2.2.10 Cross-Platform Keyboard Mapping**

Since the same shortcuts should work in Web UI, document the canonical mapping:

| Action | TUI | Web | Description |
|--------|-----|-----|-------------|
| Toggle Mode | Tab | Tab | Switch App-First ↔ Full-Phrase |
| Focus Search | `/` or type | `/` or click | Start typing to search |
| Navigate Results | ↑↓ | ↑↓ or click | Move selection |
| Select/Confirm | Enter | Enter or click | Confirm or view details |
| Go Back | Esc | Esc | Back one level |
| Change App | g | Cmd/Ctrl+K | Open app selector |
| Focus Filters | f | Cmd/Ctrl+F | Jump to filters |
| Toggle AI | a | Cmd/Ctrl+A | Turn AI on/off |
| Platform | p or Cmd+P | Cmd/Ctrl+P | Select platform |
| Settings | F6 or Cmd+, | Cmd/Ctrl+, | Open settings |
| Help | ? | ? | Show keyboard shortcuts |
| Copy Keys | c (detail view) | Cmd/Ctrl+C | Copy to clipboard |
| Open Docs | o (detail view) | Cmd/Ctrl+O | Open in browser |
| Quit | Ctrl+C or q | Cmd/Ctrl+W | Close/exit |

**Note**: Vi-style keys (a, p, g, f, /) are consistent across TUI and Web. Web also supports Cmd/Ctrl modifiers to avoid conflicts with browser shortcuts.

---

**Summary of TUI Design**:

✅ **Two search modes** with clear toggle (Tab)
✅ **App-first mode** optimized for focused learning
✅ **Full-phrase mode** for natural language queries
✅ **Comprehensive filtering** (context, category, tags)
✅ **OS shortcuts** included as special apps
✅ **Consistent keyboard navigation** across modes
✅ **AI toggle** with clear on/off state
✅ **Platform selector** as global preference
✅ **Detail view** with copy/open actions
✅ **Performance-focused** with fast feedback
✅ **Designed for muscle memory** (same keys in TUI and Web)

### Phase 3: Web Interface (Week 3-4)

**Design Philosophy**: Mirror TUI functionality with web-native enhancements

#### 3.1 Web App Structure

```
web/
├── app/
│   ├── page.tsx              # Main search interface (matches TUI)
│   ├── login/
│   │   └── page.tsx          # Login/Sign up page
│   ├── dashboard/
│   │   └── page.tsx          # User dashboard (Premium)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── signup/route.ts
│   │   │   └── logout/route.ts
│   │   ├── search/route.ts   # Keyword search endpoint
│   │   ├── ai/route.ts       # AI search (managed)
│   │   └── sync/route.ts     # Sync endpoint (Premium)
│   └── layout.tsx
├── components/
│   ├── SearchBar.tsx
│   ├── ResultsList.tsx
│   ├── ShortcutDetail.tsx
│   ├── AppSelector.tsx
│   ├── Filters.tsx
│   └── LoginForm.tsx
└── lib/
    ├── api-client.ts
    └── auth.ts
```

#### 3.2 Key Differences from TUI

**Additional Features**:
- Login/Sign up page for Premium users
- User dashboard (view usage, manage API keys, sync status)
- Click-based navigation in addition to keyboard
- Responsive design (mobile-friendly)
- Share shortcuts via URL
- Export shortcuts (CSV, JSON, PDF)

**Consistent Features** (matches TUI exactly):
- Two search modes: App-First and Full-Phrase (Tab to toggle)
- Same keyboard shortcuts (adapted with Cmd/Ctrl modifiers)
- Same filtering options (Context, Category, Tags)
- Platform selector (p or Cmd+P)
- AI toggle (a or Cmd+A)
- Help overlay (? key)
- Settings panel (Cmd+,)

**UI Framework**:
- Next.js 14+ (App Router)
- Tailwind CSS for styling
- Radix UI or shadcn/ui for components (keyboard-accessible)
- NextAuth.js for authentication

#### 3.3 Monetization Model

**Free Tier (TUI)**:
- Full keyword search
- BYOK for AI search (provide your own API key)
- Open source (MIT license)
- Self-hosted data

**Free Tier (Web)**:
- Keyword search
- Limited AI queries (5/day)
- Community shortcuts only
- No account required

**Premium Tier (Web + TUI) - $5-10/mo**:
- Account required (email + password or OAuth)
- Unlimited AI queries (managed API key)
- Cloud sync between TUI and Web
- Custom shortcuts storage
- Collections/favorites
- Export shortcuts (JSON, PDF, CSV)
- Priority support

### Phase 4: Data Sources & Scraping (Ongoing)

#### 4.1 Initial Target Apps (Top 20)

**Terminal Tools**:
- vim/neovim
- tmux
- less/bat/more
- git
- fzf
- ripgrep
- zsh/bash

**Code Editors**:
- VSCode
- Sublime Text
- IntelliJ IDEA

**Productivity**:
- Obsidian
- Notion (web app)
- Linear

**Browsers**:
- Chrome/Firefox DevTools
- Vimium extensions

#### 4.2 Scraping Strategy per Source Type

**Type 1: Man Pages**
```bash
man vim | col -b > vim.txt
# Parse with regex for KEY sections
```

**Type 2: GitHub README**
```typescript
// Use GitHub API to fetch README
// Parse markdown tables/lists
```

**Type 3: Web Documentation**
```typescript
// Cheerio for static HTML
// Puppeteer if JavaScript-rendered
// Look for: <kbd>, <code>, tables with "Shortcut" headers
```

**Type 4: Config Files**
```json
// Many apps ship with default keybindings
// VSCode: keybindings.json
// Tmux: tmux.conf
```

#### 4.3 MCP Integration (Explore)

**Potential MCP Servers**:
- `@modelcontextprotocol/server-puppeteer` - web scraping
- `@modelcontextprotocol/server-filesystem` - read local configs
- `@modelcontextprotocol/server-github` - fetch from GitHub

**Usage**: Connect MCP client in core engine, use for on-demand scraping

### Phase 5: MVP Launch (Week 4)

**Deliverables**:
1. TUI npm package: `npm install -g katasumi`
2. Web app: katasumi.dev (or similar)
3. Core shortcuts DB for 20 popular apps
4. GitHub repo with contribution guide

**Success Metrics**:
- <100ms search latency (TUI)
- >80% accuracy for popular apps
- Community contributions (PRs to shortcuts DB)

## Open Questions (NEEDS DISCUSSION)

### 1. Database Strategy
- [ ] No DB (pure pull) vs Curated DB vs Hybrid?
- [ ] If DB: SQLite (embedded) vs PostgreSQL (hosted)?
- [ ] Update frequency: Real-time, Daily, Weekly?

### 2. TUI Framework
- [ ] Ink (React) vs Blessed vs Bare Metal?
- [ ] Trade-off: Dev speed vs Performance vs Simplicity

### 3. Scraping Approach
- [ ] On-demand vs Scheduled vs Hybrid?
- [ ] Should we use scrapy (Python) for complex cases?
- [ ] How to handle rate limiting?

### 4. AI Integration
- [ ] Default to keyword search, AI as enhancement?
- [ ] Which providers: OpenAI only or multi-provider?
- [ ] Ollama support for local/offline?

### 5. Data Schema
```typescript
// Proposed schema (needs refinement)
interface Shortcut {
  id: string;
  app: string;
  version?: string;
  action: string;          // "Move cursor left"
  keys: {
    mac?: string;          // "⌘←"
    windows?: string;      // "Ctrl+←"
    linux?: string;        // "Ctrl+←"
  };
  context?: string;        // "Normal Mode", "Editor Focus"
  category?: string;       // "Navigation", "Editing"
  tags: string[];          // ["cursor", "movement"]
  source: string;          // URL to docs
  confidence?: number;     // 0-1 if AI-scraped
  lastUpdated: Date;
}
```

## Next Steps

1. **Decide on architecture choices** (review questions above)
2. **Create monorepo scaffold** (`pnpm init` + workspaces)
3. **Build core search engine** (keyword first)
4. **Choose TUI approach** and build MVP interface
5. **Manually create initial dataset** (10-20 apps) in JSON
6. **Test with real users** (dogfood the TUI)
7. **Iterate based on feedback**

## Timeline Estimate

- Week 1: Architecture decisions + core engine
- Week 2: TUI MVP + manual data for 5 apps
- Week 3: Web interface + scraping pipeline
- Week 4: Polish + 20 app coverage + launch

**Total: ~4 weeks to MVP**

---

## Notes

- Start simple: keyword search + manually curated shortcuts
- Add AI enhancement later (not MVP blocker)
- Focus on making the core experience fast and delightful
- Community contributions will be key to scale
- Consider using existing cheat.sh data as starting point?

