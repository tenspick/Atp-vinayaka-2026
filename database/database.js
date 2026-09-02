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

const bcrypt = require('bcryptjs');

// Auto-seed admin accounts synchronously if admins table has no records
try {
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
    if (adminCount === 0) {
        console.log('🌱 No admins found in database, running synchronous auto-seed...');
        const seededAdmins = [
            { username: 'suryamohanreddys@gmail.com', full_name: 'Surya Mohan Reddy', pass: process.env.ADMIN01_PASSWORD || 'Admin@2026', role: 'SUPER_ADMIN' },
            { username: 'admin01', full_name: 'Surya Mohan Reddy', pass: process.env.ADMIN01_PASSWORD || 'Admin@2026', role: 'SUPER_ADMIN' },
            { username: 'admin02', full_name: 'Yaddala Ranjith Goud (Sunny)', pass: process.env.ADMIN02_PASSWORD || 'Admin02@2026', role: 'ADMIN' },
            { username: 'sunny_goud', full_name: 'Yaddala Ranjith Goud (Sunny)', pass: process.env.ADMIN02_PASSWORD || 'Admin02@2026', role: 'ADMIN' },
            { username: 'admin03', full_name: 'Committee Member 03', pass: process.env.ADMIN03_PASSWORD || 'Admin03@2026', role: 'ADMIN' },
            { username: 'admin04', full_name: 'Committee Member 04', pass: process.env.ADMIN04_PASSWORD || 'Admin04@2026', role: 'ADMIN' },
            { username: 'admin05', full_name: 'Committee Member 05', pass: process.env.ADMIN05_PASSWORD || 'Admin05@2026', role: 'ADMIN' },
            { username: 'admin06', full_name: 'Committee Member 06', pass: process.env.ADMIN06_PASSWORD || 'Admin06@2026', role: 'ADMIN' },
            { username: 'admin07', full_name: 'Committee Member 07', pass: process.env.ADMIN07_PASSWORD || 'Admin07@2026', role: 'ADMIN' },
            { username: 'admin08', full_name: 'Committee Member 08', pass: process.env.ADMIN08_PASSWORD || 'Admin08@2026', role: 'ADMIN' },
            { username: 'admin09', full_name: 'Committee Member 09', pass: process.env.ADMIN09_PASSWORD || 'Admin09@2026', role: 'ADMIN' },
            { username: 'admin10', full_name: 'Committee Member 10', pass: process.env.ADMIN10_PASSWORD || 'Admin10@2026', role: 'ADMIN' }
        ];

        const upsertAdmin = db.prepare(`
            INSERT INTO admins (username, full_name, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, 1)
            ON CONFLICT(username) DO UPDATE SET
                full_name = excluded.full_name,
                password_hash = excluded.password_hash,
                role = excluded.role,
                is_active = 1
        `);

        for (const a of seededAdmins) {
            const hash = bcrypt.hashSync(a.pass, 10);
            upsertAdmin.run(a.username, a.full_name, hash, a.role);
        }

        const defaultSettings = {
            festival_name: 'ANANTHAMPALLI VILLAGE VINAYAKA CHAVITHI 2026',
            festival_year: '2026',
            village_name: 'Ananthampalli Village',
            main_location: 'Ananthampalli Main Temple Street Mandap',
            contact_person: 'Yaddala Ranjith Goud (Sunny)',
            contact_number: '+91 76709 87767',
            developer_contact: '7330863893',
            developer_whatsapp: '7330863893',
            developer_credit: 'KLIVOO NEXT GEN CRMS (A TENSPICK INITIATIVE)',
            public_financial_summary: 'ON',
            public_expenses_detail: 'ON',
            donator_privacy_default: 'PUBLIC',
            whatsapp_country_code: '91',
            currency_symbol: '₹',
            receipt_prefix: 'AVVC-2026-',
            festival_start_date: '2026-09-14',
            receipt_footer_text: 'DESIGNED AND DEVELOPED PROUDLY IN ANANTHAMPALLI BY KLIVOO NEXT GEN CRMS (A TENSPICK INITIATIVE) • Contact Developer: 7330863893 — WhatsApp Only'
        };

        const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        for (const [key, value] of Object.entries(defaultSettings)) {
            insertSetting.run(key, value);
        }

        console.log('✅ Auto-seeded admins and settings synchronously on startup');
    }
} catch (e) {
    console.error('Auto-seed check notice:', e.message);
}

console.log('✅ SQLite Database Connected & Schema Initialized at:', dbPath);

module.exports = db;
