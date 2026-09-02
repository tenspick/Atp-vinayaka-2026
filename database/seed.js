require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database');

async function seed() {
    console.log('🌱 Starting Database Seeding...');

    // 1. Seed Specific Admin Accounts with Full Names
    const seededAdmins = [
        { username: 'suryamohanreddys@gmail.com', full_name: 'Surya Mohan Reddy', pass: '10061996', role: 'SUPER_ADMIN' },
        { username: 'admin01', full_name: 'Surya Mohan Reddy', pass: '10061996', role: 'SUPER_ADMIN' },
        { username: 'admin02', full_name: 'Yaddala Ranjith Goud (Sunny)', pass: '04072007', role: 'ADMIN' },
        { username: 'sunny_goud', full_name: 'Yaddala Ranjith Goud (Sunny)', pass: '04072007', role: 'ADMIN' },
        { username: 'admin03', full_name: 'Committee Member 03', pass: 'Admin03@2026', role: 'ADMIN' },
        { username: 'admin04', full_name: 'Committee Member 04', pass: 'Admin04@2026', role: 'ADMIN' }
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
    console.log('✅ Admin Accounts seeded with Full Names (Surya Mohan Reddy, Yaddala Ranjith Goud Sunny)');

    // 2. Update existing donation collected_by fields to use Full Name instead of email if needed
    db.prepare(`
        UPDATE donations SET collected_by = 'Surya Mohan Reddy' 
        WHERE collected_by LIKE '%suryamohanreddys%' OR collected_by = 'admin01' OR collected_by IS NULL
    `).run();

    db.prepare(`
        UPDATE donations SET collected_by = 'Yaddala Ranjith Goud (Sunny)' 
        WHERE collected_by = 'admin02' OR collected_by = 'sunny_goud'
    `).run();

    // 3. Seed Default Settings
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

    const insertSetting = db.prepare(`
        INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
    `);

    for (const [key, value] of Object.entries(defaultSettings)) {
        insertSetting.run(key, value);
    }
    console.log('✅ Default settings initialized');

    // 4. Seed Specified Key Donors if table has fewer than 4 records
    const donationCount = db.prepare('SELECT COUNT(*) as count FROM donations').get().count;
    if (donationCount < 4) {
        const insertDonation = db.prepare(`
            INSERT OR IGNORE INTO donations (receipt_number, donor_name, mobile, date, amount, payment_method, sponsorship_title, notes, collected_by, is_anonymous)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `);

        insertDonation.run(
            'AVVC-2026-0001',
            'SURA RAMANA REDDY AND SONS',
            '9876543210',
            '2026-09-01',
            25000,
            'Cash',
            'Ganesha Idol',
            'Donated sacred Lord Vinayaka Idol for village mandap',
            'Surya Mohan Reddy'
        );

        insertDonation.run(
            'AVVC-2026-0002',
            'SURA RAMANA REDDY AND SONS',
            '9876543210',
            '2026-09-01',
            15000,
            'Cash',
            'Gifts for Events',
            'Sponsored prizes & gifts for cultural competitions',
            'Surya Mohan Reddy'
        );

        insertDonation.run(
            'AVVC-2026-0003',
            'PADMAVATHAMMA AND SON RAMA KRISHNAM RAJU (BABU)',
            '9876543210',
            '2026-09-01',
            20000,
            'Cash',
            'Day 1 Food Donation',
            'Sponsored Day 1 Grand Annadanam for entire village',
            'Yaddala Ranjith Goud (Sunny)'
        );

        insertDonation.run(
            'AVVC-2026-0004',
            'PENAGALURU MANI',
            '9876543210',
            '2026-09-01',
            15000,
            'Cash',
            'Day 2 Food Donation',
            'Sponsored Day 2 Sacred Meal Distribution',
            'Yaddala Ranjith Goud (Sunny)'
        );

        console.log('✅ Key village donors seeded with full collector names');
    }

    console.log('🎉 Database seeding complete!');
}

seed().catch(err => {
    console.error('❌ Seeding Error:', err);
    process.exit(1);
});
