import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
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
let envFile = '.env.local';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env-file' && args[i + 1]) {
        envFile = args[i + 1];
        i++;
    } else if (args[i] === '--help') {
        console.log(`Usage: node scripts/migrate.mjs [--env-file .env.local]`);
        console.log(``);
        console.log(`Options:`);
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
console.log(`${BLUE}🔨 Running Migrations...${NC}`);
console.log("");

// Check for migrations directory
const migrationsDir = path.resolve(PROJECT_ROOT, 'supabase/migrations');
if (!fs.existsSync(migrationsDir)) {
    console.error(`${RED}❌ Migrations directory not found: ${migrationsDir}${NC}`);
    process.exit(1);
}

const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

let migrationCount = 0;
const failedMigrations = [];

for (const migration of migrationFiles) {
    const migrationPath = path.resolve(migrationsDir, migration);
    console.log(`  ${BLUE}→ ${migration}${NC}`);
    try {
        // We use -v ON_ERROR_STOP=1 to ensure psql fails if the SQL fails
        execSync(`psql "${dbUrl}" -v ON_ERROR_STOP=1 -f "${migrationPath}"`, { stdio: 'ignore' });
        migrationCount++;
    } catch (error) {
        console.log(`    ${RED}✗ Failed${NC}`);
        failedMigrations.push(migration);
    }
}

console.log("");
if (failedMigrations.length > 0) {
    console.log(`${RED}❌ ${failedMigrations.length} migration(s) failed:${NC}`);
    failedMigrations.forEach(failed => console.log(`   - ${failed}`));
    process.exit(1);
} else {
    console.log(`${GREEN}✅ ${migrationCount} migrations applied successfully!${NC}`);
    process.exit(0);
}
