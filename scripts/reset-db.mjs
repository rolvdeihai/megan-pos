import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Colors for output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m'; // No Color

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Parse arguments
const args = process.argv.slice(2);
let force = false;
let envFile = '.env.local';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--force') {
        force = true;
    } else if (args[i] === '--env-file' && args[i + 1]) {
        envFile = args[i + 1];
        i++;
    } else if (args[i] === '--help') {
        console.log(`Usage: node scripts/reset-db.mjs [--force] [--env-file .env.local]`);
        console.log(``);
        console.log(`Options:`);
        console.log(`  --force       Skip confirmation prompt (use with caution)`);
        console.log(`  --env-file    Specify custom env file (default: .env.local)`);
        process.exit(0);
    }
}

// Load environment variables
const envPath = path.resolve(PROJECT_ROOT, envFile);
if (fs.existsSync(envPath)) {
    console.log(`${BLUE}📂 Loading environment from ${envFile}...${NC}`);
    dotenv.config({ path: envPath });
} else {
    console.log(`${YELLOW}⚠️  Env file not found: ${envPath}${NC}`);
    console.log(`${YELLOW}   Trying to use direct environment variables...${NC}`);
}

// Database connection logic
let dbUrl = process.env.DIRECT_URL || process.env.DB_URL || process.env.SUPABASE_DB_URL;

if (!dbUrl) {
    const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB } = process.env;
    if (POSTGRES_HOST && POSTGRES_USER && POSTGRES_PASSWORD && POSTGRES_DB) {
        dbUrl = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT || 5432}/${POSTGRES_DB}`;
    }
}

if (!dbUrl) {
    console.error(`${RED}❌ No database connection found.${NC}`);
    console.error(`${YELLOW}   Please set one of: DIRECT_URL, DB_URL, SUPABASE_DB_URL${NC}`);
    console.error(`${YELLOW}   Or set: POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB${NC}`);
    process.exit(1);
}

// Verify psql is installed
try {
    execSync('psql --version', { stdio: 'ignore' });
} catch (error) {
    console.error(`${RED}❌ psql is not installed. Please install PostgreSQL client.${NC}`);
    process.exit(1);
}

console.log("");
console.log(`${BLUE}🗑️  Resetting JetNote Pos Database...${NC}`);
console.log("");

// Test connection
console.log(`${BLUE}🔌 Testing database connection...${NC}`);
try {
    execSync(`psql "${dbUrl}" -c "SELECT 1;"`, { stdio: 'ignore' });
    console.log(`${GREEN}✅ Connected successfully${NC}`);
} catch (error) {
    console.error(`${RED}❌ Failed to connect to database.${NC}`);
    console.error(`${YELLOW}   Please check your database credentials.${NC}`);
    process.exit(1);
}
console.log("");

async function run() {
    // Confirm before reset
    if (!force) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise(resolve => {
            rl.question(`${YELLOW}⚠️  This will DELETE all data in the database. Continue? (y/N): ${NC}`, resolve);
        });

        rl.close();

        if (!['y', 'yes'].includes(answer.toLowerCase())) {
            console.log(`${RED}❌ Cancelled${NC}`);
            process.exit(1);
        }
    }

    console.log("");
    console.log(`${BLUE}📋 Dropping tables...${NC}`);

    const dropTablesSql = `
    DROP TABLE IF EXISTS public.order_items CASCADE;
    DROP TABLE IF EXISTS public.orders CASCADE;
    DROP TABLE IF EXISTS public.transactions CASCADE;
    DROP TABLE IF EXISTS public.menu_items CASCADE;
    DROP TABLE IF EXISTS public.menu_categories CASCADE;
    DROP TABLE IF EXISTS public.restaurant_tables CASCADE;
    DROP TABLE IF EXISTS public.inventory CASCADE;
    DROP TABLE IF EXISTS public.recipe_items CASCADE;
    DROP TABLE IF EXISTS public.menu_item_ingredients CASCADE;
    DROP TABLE IF EXISTS public.attendance_logs CASCADE;
    DROP TABLE IF EXISTS public.payrolls CASCADE;
    DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
    DROP TABLE IF EXISTS public.packages CASCADE;
    DROP TABLE IF EXISTS public.restaurant_settings CASCADE;
    DROP TABLE IF EXISTS public.role_permissions CASCADE;
    DROP TABLE IF EXISTS public.employees CASCADE;
    DROP TABLE IF EXISTS public.roles CASCADE;
    DROP TABLE IF EXISTS public.permissions CASCADE;
    DROP TABLE IF EXISTS public.users CASCADE;
    DROP TABLE IF EXISTS public.otps CASCADE;
  `;

    try {
        execSync(`psql "${dbUrl}" -c "${dropTablesSql}"`, { stdio: 'ignore' });
        console.log(`${GREEN}✅ Tables dropped${NC}`);
    } catch (error) {
        console.log(`${YELLOW}⚠️  Some tables may not have existed${NC}`);
    }
    console.log("");

    // Check for migrations directory
    const migrationsDir = path.resolve(PROJECT_ROOT, 'supabase/migrations');
    if (!fs.existsSync(migrationsDir)) {
        console.error(`${RED}❌ Migrations directory not found: ${migrationsDir}${NC}`);
        process.exit(1);
    }

    console.log(`${BLUE}🔨 Re-running migrations...${NC}`);

    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

    let migrationCount = 0;
    const failedMigrations = [];

    for (const migration of migrationFiles) {
        const migrationPath = path.resolve(migrationsDir, migration);
        console.log(`  ${BLUE}→ ${migration}${NC}`);
        try {
            execSync(`psql "${dbUrl}" -f "${migrationPath}"`, { stdio: 'ignore' });
            migrationCount++;
        } catch (error) {
            console.log(`    ${RED}✗ Failed${NC}`);
            failedMigrations.push(migration);
        }
    }

    console.log("");
    console.log(`${GREEN}✅ ${migrationCount} migrations applied${NC}`);

    if (failedMigrations.length > 0) {
        console.log(`${RED}❌ ${failedMigrations.length} migration(s) failed:${NC}`);
        failedMigrations.forEach(failed => console.log(`   - ${failed}`));
    }

    console.log("");
    console.log(`${BLUE}🌱 Seeding default data...${NC}`);

    const seedPackagesSql = `
    INSERT INTO public.packages (id, name, price, duration_days, features, is_active) VALUES
      ('basic', 'Basic', 300000, 30, '["Max 100 transaksi/bulan", "1 admin user", "Laporan dasar", "Menu online"]', true),
      ('pro', 'Pro', 500000, 30, '["Unlimited transaksi", "3 staff users", "Laporan lengkap", "Inventory management", "Support priority"]', true),
      ('enterprise', 'Enterprise', 800000, 30, '["Unlimited transaksi", "10 staff users", "Semua fitur pro", "API access", "Custom development", "24/7 support"]', true)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      price = EXCLUDED.price,
      duration_days = EXCLUDED.duration_days,
      features = EXCLUDED.features,
      is_active = EXCLUDED.is_active;
  `;

    try {
        execSync(`psql "${dbUrl}" -c '${seedPackagesSql}'`, { stdio: 'ignore' });
        console.log(`  ${GREEN}✓ Packages seeded${NC}`);
    } catch (error) {
        console.log(`${YELLOW}⚠️  Packages may already exist or error occurred${NC}`);
    }

    const seedFile = path.resolve(PROJECT_ROOT, 'supabase/seed.sql');
    if (fs.existsSync(seedFile)) {
        console.log(`  ${BLUE}→ Running seed.sql${NC}`);
        try {
            execSync(`psql "${dbUrl}" -f "${seedFile}"`, { stdio: 'ignore' });
            console.log(`  ${GREEN}✓ Seed data applied${NC}`);
        } catch (error) {
            console.log(`${YELLOW}⚠️  Seed file had warnings${NC}`);
        }
    }

    console.log("");
    console.log(`${GREEN}✅ Database reset complete!${NC}`);
    console.log("");

    // Summary
    console.log(`${BLUE}📊 Current tables:${NC}`);
    try {
        const tables = execSync(`psql "${dbUrl}" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"`, { encoding: 'utf8' })
            .split('\n')
            .map(t => t.trim())
            .filter(t => t.length > 0)
            .map(t => `  • ${t}`)
            .join('\n');
        console.log(tables || "  (No tables found)");
    } catch (error) {
        console.log("  (Error fetching tables)");
    }
    console.log("");

    console.log(`${BLUE}📦 Packages:${NC}`);
    try {
        const packages = execSync(`psql "${dbUrl}" -t -c "SELECT id || ' - ' || name || ' (Rp ' || price || ')' FROM packages ORDER BY price;"`, { encoding: 'utf8' })
            .split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => `  • ${p}`)
            .join('\n');
        console.log(packages || "  (No packages)");
    } catch (error) {
        console.log("  (Error fetching packages)");
    }
    console.log("");

    console.log(`${GREEN}🎉 Done! Your database is fresh and ready.${NC}`);
}

run();
