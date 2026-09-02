const express = require('express');
const router = express.Router();
const db = require('../database/database');

// GET /api/donators (Public page list)
router.get('/', (req, res) => {
    try {
        const { filter, search } = req.query; // filter: 'all', 'top', 'recent'

        let query = `
            SELECT id, receipt_number, 
                   CASE WHEN is_anonymous = 1 THEN 'Anonymous Donor' ELSE donor_name END as donor_name,
                   sponsorship_title, amount, date, payment_method
            FROM donations WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ` AND (donor_name LIKE ? AND is_anonymous = 0)`;
            params.push(`%${search.trim()}%`);
        }

        if (filter === 'top') {
            query += ' ORDER BY amount DESC, date DESC LIMIT 20';
        } else if (filter === 'recent') {
            query += ' ORDER BY id DESC LIMIT 15';
        } else {
            query += ' ORDER BY id DESC';
        }

        const donators = db.prepare(query).all(...params);

        // Fetch top donators count and stats
        const totalDonors = db.prepare('SELECT COUNT(*) as count FROM donations').get().count;

        res.json({ donators, totalDonors });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch donators list' });
    }
});

module.exports = router;
