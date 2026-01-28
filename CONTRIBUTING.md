# Contributing to Katasumi

Thank you for your interest in contributing to Katasumi! We welcome contributions from the community and are excited to have you on board.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Contributing Code](#contributing-code)
  - [Improving Documentation](#improving-documentation)
- [Development Environment Setup](#development-environment-setup)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to providing a welcoming and inclusive experience for everyone. Please be respectful and considerate in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/joshpitkin/katasumi/issues) to avoid duplicates.

When you create a bug report, please include:

- **Clear title and description** of the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs. **actual behavior**
- **Screenshots** if applicable
- **Environment details**: OS, Node.js version, package version
- **Additional context** that might be helpful

Use the bug report template when available.

**Example:**
```markdown
**Bug Description**
TUI crashes when searching for shortcuts with special characters

**Steps to Reproduce**
1. Launch TUI with `npm run start:tui`
2. Type "copy (" in the search box
3. Application crashes

**Expected Behavior**
Search should handle special characters gracefully

**Environment**
- OS: Ubuntu 22.04
- Node.js: v18.17.0
- Katasumi version: 1.0.0
```

### Suggesting Features

Feature suggestions are welcome! Before creating a feature request:

1. Check [existing issues](https://github.com/joshpitkin/katasumi/issues) for similar suggestions
2. Review the [project roadmap](DEVELOPMENT_PRIORITIES.md) to see if it's already planned
3. Consider whether the feature fits the project's philosophy

When suggesting a feature, please include:

- **Clear title** describing the feature
- **Motivation**: Why is this feature needed?
- **Proposed solution**: How should it work?
- **Alternatives considered**: Other ways to solve the problem
- **Additional context**: Mockups, examples, or references

### Contributing Code

We accept contributions through pull requests. Here's how to get started:

1. **Fork the repository** to your GitHub account
2. **Clone your fork** locally
3. **Set up the development environment** (see below)
4. **Create a feature branch** from `main`
5. **Make your changes** with clear, atomic commits
6. **Test your changes** thoroughly
7. **Push to your fork** and submit a pull request

### Improving Documentation

Documentation improvements are always welcome! This includes:

- Fixing typos or clarifying existing docs
- Adding examples or tutorials
- Improving API documentation
- Writing guides for common tasks
- Translating documentation

Documentation changes follow the same pull request process as code changes.

## Development Environment Setup

### Prerequisites

- **Node.js 18+** and npm (or pnpm)
- **Docker** and **Docker Compose** (recommended for local development)
- **OR** PostgreSQL 14+ (if not using Docker)
- Git

### Quick Setup

For the fastest setup, use our automated script:

```bash
git clone https://github.com/joshpitkin/katasumi.git
cd katasumi
./quick-setup.sh
```

This will:
- Start PostgreSQL via Docker
- Copy environment configuration files
- Install dependencies
- Build and seed both SQLite (TUI) and PostgreSQL (Web) databases

### Manual Setup

If you prefer to set up manually or need more control:

#### 1. Clone and Install

```bash
git clone https://github.com/joshpitkin/katasumi.git
cd katasumi
npm install
```

#### 2. Start PostgreSQL

**Using Docker (recommended):**
```bash
docker-compose up -d
```

**Manual installation:**
See [DEVELOPMENT.md](DEVELOPMENT.md) for platform-specific PostgreSQL installation instructions.

#### 3. Configure Environment

```bash
# Core package (SQLite for TUI)
cp packages/core/.env.example packages/core/.env

# Web package (PostgreSQL)
cp packages/web/.env.example packages/web/.env.local
```

#### 4. Build and Seed Databases

```bash
# Build SQLite database for TUI
npm run setup:tui

# Setup PostgreSQL for Web
cd packages/core
DATABASE_URL="postgres://katasumi:dev_password@localhost:5432/katasumi_dev" DB_TYPE="postgres" npm run migrate
DATABASE_URL="postgres://katasumi:dev_password@localhost:5432/katasumi_dev" npm run seed
cd ../..
```

#### 5. Start Development Servers

```bash
# Run all packages in development mode
npm run dev
```

For detailed setup instructions and troubleshooting, see [DEVELOPMENT.md](DEVELOPMENT.md).

## Development Workflow

### Project Structure

```
katasumi/
├── packages/
│   ├── core/       # Shared types, database adapters, search logic
│   ├── tui/        # Terminal User Interface
│   └── web/        # Next.js web application
├── docs/           # API documentation
└── ...
```

### Working on Different Parts

**Core Package:**
```bash
cd packages/core
npm run build  # Rebuild after changes
npm test       # Run tests
```

**TUI:**
```bash
npm run dev --workspace=@katasumi/tui  # Watch mode
npm run start:tui                       # Test the TUI
```

**Web:**
```bash
npm run dev --workspace=@katasumi/web  # Next.js dev server
# Visit http://localhost:3000
```

### Running Tests

```bash
# All tests
npm test

# Specific package
npm test --workspace=@katasumi/core

# Watch mode
npm test -- --watch
```

### Database Management

```bash
# Check migration status
npm run migrate:status

# Create a new migration
cd packages/core
npm run migrate:create migration_name

# Rollback last migration
npm run migrate:rollback

# Re-seed database
npm run seed
```

## Pull Request Process

### Before Submitting

1. **Update your fork** with the latest changes from `main`
2. **Run tests** and ensure they pass: `npm test`
3. **Run type checking**: `npm run typecheck`
4. **Update documentation** if you've changed APIs or added features
5. **Add tests** for new functionality
6. **Update CHANGELOG** if applicable

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): brief description

Longer explanation if needed

Fixes #123
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(tui): add fuzzy search ranking algorithm

fix(core): handle null values in search filters

docs(readme): update installation instructions

test(web): add integration tests for auth flow
```

### Pull Request Template

When you create a pull request, please include:

- **Description**: What does this PR do?
- **Motivation**: Why is this change needed?
- **Changes**: List of specific changes made
- **Testing**: How was this tested?
- **Screenshots**: If applicable
- **Checklist**: 
  - [ ] Tests pass
  - [ ] Code is properly typed
  - [ ] Documentation updated
  - [ ] CHANGELOG updated (if applicable)

### Review Process

1. **Automated checks** will run (tests, type checking, linting)
2. A **maintainer will review** your PR within a few days
3. You may be asked to make **changes or improvements**
4. Once approved, a maintainer will **merge your PR**

## Style Guidelines

### TypeScript

- Use **TypeScript** for all new code
- Prefer **interfaces** over types when possible
- Use **explicit return types** for public functions
- Avoid `any` - use `unknown` if truly unknown
- Use **strict mode** (already configured)

### Code Style

- **Prettier** is used for formatting (run `npm run format`)
- **ESLint** enforces code quality (run `npm run lint`)
- Use **meaningful variable names**
- Keep functions **small and focused**
- Add **JSDoc comments** for public APIs

### File Organization

- Keep related code together
- Use **index.ts** for clean exports
- Group imports: external → internal → relative
- Keep test files next to source files: `foo.ts` / `foo.test.ts`

### Component Guidelines (TUI)

- Use **Ink components** for TUI development
- Keep components **small and focused**
- Use **hooks** for state management
- Extract **reusable logic** into custom hooks

### Component Guidelines (Web)

- Use **React Server Components** where possible
- Keep client components **minimal**
- Use **Tailwind CSS** for styling
- Follow **Next.js best practices**

## Testing Guidelines

### Unit Tests

- Test **business logic** in isolation
- Mock external dependencies
- Use **descriptive test names**
- Follow **Arrange-Act-Assert** pattern

### Integration Tests

- Test **component interactions**
- Use realistic data
- Test **error scenarios**

### E2E Tests

- Test **critical user flows**
- Keep tests **stable and reliable**
- Use **meaningful selectors**

### Test Coverage

- Aim for **80%+ coverage** for core logic
- Focus on **critical paths**
- Don't test for the sake of coverage

## Community

### Getting Help

- **GitHub Discussions**: Ask questions and share ideas
- **Issues**: Report bugs or suggest features
- **Discord/Slack**: (Coming soon) Real-time chat

### Stay Updated

- **Star** the repository to stay informed
- Watch for **releases** and updates
- Follow the **project roadmap**

### Recognition

Contributors will be recognized in:
- The project README
- Release notes
- A CONTRIBUTORS.md file (coming soon)

---

Thank you for contributing to Katasumi! Your efforts help make keyboard shortcuts accessible to everyone. 🚀

**Questions?** Feel free to open an issue or start a discussion!
