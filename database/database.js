const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let dbPath = path.join(__dirname, 'festival.sqlite');
const schemaPath = path.join(__dirname, 'schema.sql');

// If running on Vercel Serverless environment, use /tmp writable directory
if (process.env.VERCEL) {
    const tmpDbPath = path.join('/tmp', 'festival.sqlite');
    if (!fs.existsSync(tmpDbPath)) {
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, tmpDbPath);
        }
    }
    dbPath = tmpDbPath;
}

// Initialize SQLite database
const db = new Database(dbPath, { verbose: null });

// Enable foreign keys & WAL mode
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Execute Schema Initialization
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Migration check for sponsorship_title column in donations table
try {
    const tableInfo = db.prepare("PRAGMA table_info(donations)").all();
    const hasCol = tableInfo.some(c => c.name === 'sponsorship_title');
    if (!hasCol) {
        db.exec("ALTER TABLE donations ADD COLUMN sponsorship_title TEXT;");
        console.log('✅ Migrated donations table: added sponsorship_title column');
    }
} catch (e) {
    console.error('Migration notice:', e.message);
}

// Migration check for full_name column in admins table
try {
    const adminCols = db.prepare("PRAGMA table_info(admins)").all();
    const hasFullName = adminCols.some(c => c.name === 'full_name');
    if (!hasFullName) {
        db.exec("ALTER TABLE admins ADD COLUMN full_name TEXT;");
        console.log('✅ Migrated admins table: added full_name column');
    }
} catch (e) {
    console.error('Migration notice:', e.message);
}

// Auto-seed admin accounts if admins table has no records
try {
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
    if (adminCount === 0) {
        console.log('🌱 No admins found in database, running auto-seed...');
        const seed = require('./seed');
        seed();
    }
} catch (e) {
    console.error('Auto-seed check notice:', e.message);
}

console.log('✅ SQLite Database Connected & Schema Initialized at:', dbPath);

module.exports = db;
