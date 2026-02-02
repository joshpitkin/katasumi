#!/bin/bash
# Quick setup script for Katasumi full-stack development

set -e  # Exit on error

echo "🚀 Katasumi Quick Setup"
echo "======================"
echo ""

# Check if Docker is available
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose found"
    read -p "Start PostgreSQL with Docker? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🐳 Starting PostgreSQL container..."
        docker-compose up -d
        echo "✅ PostgreSQL running on localhost:5432"
        echo ""
        
        # Wait for PostgreSQL to be ready
        echo "⏳ Waiting for PostgreSQL to be ready..."
        sleep 3
    fi
else
    echo "⚠️  Docker Compose not found. You'll need to set up PostgreSQL manually."
    echo "   See DEVELOPMENT.md for instructions."
    echo ""
fi

# Copy environment files if they don't exist
echo "📝 Setting up environment files..."

if [ ! -f "packages/core/.env" ]; then
    cp packages/core/.env.example packages/core/.env
    echo "✅ Created packages/core/.env"
else
    echo "⏭️  packages/core/.env already exists"
fi

if [ ! -f "packages/web/.env.local" ]; then
    cp packages/web/.env.example packages/web/.env.local
    echo "✅ Created packages/web/.env.local"
else
    echo "⏭️  packages/web/.env.local already exists"
fi

echo ""

# Run pnpm install
echo "📦 Installing dependencies..."
pnpm install

echo ""

# Build packages (generates Prisma clients)
echo "🔨 Building packages..."
pnpm run build

echo ""

# Setup PostgreSQL if Docker is running
if docker-compose ps | grep -q "katasumi-postgres"; then
    echo "🗄️  Setting up PostgreSQL (Web)..."
    cd packages/core
    DATABASE_URL="postgres://katasumi:dev_password@localhost:5432/katasumi_dev" DB_TYPE="postgres" pnpm run migrate
    DATABASE_URL="postgres://katasumi:dev_password@localhost:5432/katasumi_dev" DB_TYPE="postgres" pnpm run seed
    cd ../..
    echo "✅ PostgreSQL setup complete"
else
    echo "⏭️  PostgreSQL not running via Docker. Skipping web database setup."
    echo "   Run manually: cd packages/core && DATABASE_URL=postgres://<user>:<pass>@localhost:5432/<db> DB_TYPE=postgres pnpm run migrate && pnpm run seed"
fi

echo ""

# Setup SQLite for TUI
echo "🔨 Setting up SQLite (TUI)..."
pnpm run setup:tui

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start development: pnpm run dev"
echo "  2. Test TUI: pnpm run start:tui"
echo "  3. Open Web: http://localhost:3000"
echo ""
echo "For more details, see DEVELOPMENT.md"
