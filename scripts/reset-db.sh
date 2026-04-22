#!/bin/bash

# Database Reset Script for JetNote Pos
# Usage: ./scripts/reset-db.sh [--force] [--env-file .env.local]
#
# Options:
#   --force       Skip confirmation prompt (use with caution)
#   --env-file    Specify custom env file (default: .env.local)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
FORCE=false
ENV_FILE=".env.local"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE=true
      shift
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --help)
      echo "Usage: ./scripts/reset-db.sh [--force] [--env-file .env.local]"
      echo ""
      echo "Options:"
      echo "  --force       Skip confirmation prompt (use with caution)"
      echo "  --env-file    Specify custom env file (default: .env.local)"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Load environment variables
ENV_PATH="$PROJECT_ROOT/$ENV_FILE"
if [[ -f "$ENV_PATH" ]]; then
  echo -e "${BLUE}📂 Loading environment from $ENV_FILE...${NC}"
  set -a
  source "$ENV_PATH"
  set +a
else
  echo -e "${YELLOW}⚠️  Env file not found: $ENV_PATH${NC}"
  echo -e "${YELLOW}   Trying to use direct environment variables...${NC}"
fi

# Database connection - prefer DIRECT_URL, fallback to DB_URL or construct from parts
if [[ -n "$DIRECT_URL" ]]; then
  DB_URL="$DIRECT_URL"
elif [[ -n "$DB_URL" ]]; then
  DB_URL="$DB_URL"
elif [[ -n "$SUPABASE_DB_URL" ]]; then
  DB_URL="$SUPABASE_DB_URL"
else
  # Try to construct from individual parts
  if [[ -n "$POSTGRES_HOST" && -n "$POSTGRES_USER" && -n "$POSTGRES_PASSWORD" && -n "$POSTGRES_DB" ]]; then
    DB_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT:-5432}/${POSTGRES_DB}"
  else
    echo -e "${RED}❌ No database connection found.${NC}"
    echo -e "${YELLOW}   Please set one of: DIRECT_URL, DB_URL, SUPABASE_DB_URL${NC}"
    echo -e "${YELLOW}   Or set: POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB${NC}"
    exit 1
  fi
fi

# Verify psql is installed
if ! command -v psql &> /dev/null; then
  echo -e "${RED}❌ psql is not installed. Please install PostgreSQL client.${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}🗑️  Resetting JetNote Pos Database...${NC}"
echo ""

# Test connection
echo -e "${BLUE}🔌 Testing database connection...${NC}"
if ! psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${RED}❌ Failed to connect to database.${NC}"
  echo -e "${YELLOW}   Please check your database credentials.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Connected successfully${NC}"
echo ""

# Confirm before reset
if [[ $FORCE == false ]]; then
  echo -ne "${YELLOW}⚠️  This will DELETE all data in the database. Continue? (y/N): ${NC}"
  read -r confirm
  if [[ ! $confirm =~ ^[yY]$ && ! $confirm =~ ^[yY][eE][sS]$ ]]; then
    echo -e "${RED}❌ Cancelled${NC}"
    exit 1
  fi
fi

echo ""
echo -e "${BLUE}📋 Dropping tables...${NC}"

# Drop tables in correct order (respecting foreign keys)
# This list should match all tables from migrations
psql "$DB_URL" -c "
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.menu_categories CASCADE;
DROP TABLE IF EXISTS public.restaurant_tables CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.recipe_items CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
DROP TABLE IF EXISTS public.packages CASCADE;
DROP TABLE IF EXISTS public.restaurant_settings CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
" 2>/dev/null || {
  echo -e "${YELLOW}⚠️  Some tables may not have existed${NC}"
}

echo -e "${GREEN}✅ Tables dropped${NC}"
echo ""

# Check for migrations directory
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"
if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo -e "${RED}❌ Migrations directory not found: $MIGRATIONS_DIR${NC}"
  exit 1
fi

echo -e "${BLUE}🔨 Re-running migrations...${NC}"

# Run all migration files in order
MIGRATION_COUNT=0
FAILED_MIGRATIONS=()

for migration in "$MIGRATIONS_DIR"/*.sql; do
  if [[ -f "$migration" ]]; then
    MIGRATION_NAME=$(basename "$migration")
    echo -e "  ${BLUE}→ $MIGRATION_NAME${NC}"
    if psql "$DB_URL" -f "$migration" > /dev/null 2>&1; then
      ((MIGRATION_COUNT++))
    else
      echo -e "    ${RED}✗ Failed${NC}"
      FAILED_MIGRATIONS+=("$MIGRATION_NAME")
    fi
  fi
done

echo ""
echo -e "${GREEN}✅ $MIGRATION_COUNT migrations applied${NC}"

if [[ ${#FAILED_MIGRATIONS[@]} -gt 0 ]]; then
  echo -e "${RED}❌ ${#FAILED_MIGRATIONS[@]} migration(s) failed:${NC}"
  for failed in "${FAILED_MIGRATIONS[@]}"; do
    echo -e "   - $failed"
  done
fi

echo ""
echo -e "${BLUE}🌱 Seeding default data...${NC}"

# Seed packages (idempotent)
psql "$DB_URL" -c "
INSERT INTO public.packages (id, name, price, duration_days, features, is_active) VALUES
  ('basic', 'Basic', 300000, 30, '[\"Max 100 transaksi/bulan\", \"1 admin user\", \"Laporan dasar\", \"Menu online\"]', true),
  ('pro', 'Pro', 500000, 30, '[\"Unlimited transaksi\", \"3 staff users\", \"Laporan lengkap\", \"Inventory management\", \"Support priority\"]', true),
  ('enterprise', 'Enterprise', 800000, 30, '[\"Unlimited transaksi\", \"10 staff users\", \"Semua fitur pro\", \"API access\", \"Custom development\", \"24/7 support\"]', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  duration_days = EXCLUDED.duration_days,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;
" > /dev/null 2>&1 && echo -e "  ${GREEN}✓ Packages seeded${NC}" || echo -e "  ${YELLOW}⚠️  Packages may already exist${NC}"

# Check if there's a seed.sql file and run it
SEED_FILE="$PROJECT_ROOT/supabase/seed.sql"
if [[ -f "$SEED_FILE" ]]; then
  echo -e "  ${BLUE}→ Running seed.sql${NC}"
  psql "$DB_URL" -f "$SEED_FILE" > /dev/null 2>&1 && echo -e "  ${GREEN}✓ Seed data applied${NC}" || echo -e "  ${YELLOW}⚠️  Seed file had warnings${NC}"
fi

echo ""
echo -e "${GREEN}✅ Database reset complete!${NC}"
echo ""

# Summary
echo -e "${BLUE}📊 Current tables:${NC}"
TABLES=$(psql "$DB_URL" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null | grep -v '^$' | sed 's/^/  • /' || echo "  (No tables found)")
echo "$TABLES"
echo ""

echo -e "${BLUE}📦 Packages:${NC}"
PACKAGES=$(psql "$DB_URL" -t -c "SELECT id || ' - ' || name || ' (Rp ' || price || ')' FROM packages ORDER BY price;" 2>/dev/null | grep -v '^$' | sed 's/^/  • /' || echo "  (No packages)")
echo "$PACKAGES"
echo ""

echo -e "${GREEN}🎉 Done! Your database is fresh and ready.${NC}"
