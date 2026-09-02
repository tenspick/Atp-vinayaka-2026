const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');

// GET /api/dashboard/stats (Admin & Public summary if enabled)
router.get('/stats', (req, res) => {
    try {
        // Public visibility check if unauthenticated
        if (!req.session || !req.session.admin) {
            const setting = db.prepare("SELECT value FROM settings WHERE key = 'public_financial_summary'").get();
            if (!setting || setting.value !== 'ON') {
                return res.json({ publicVisible: false, message: 'Public financial summary is turned off.' });
            }
        }

        // Calculate Totals directly in SQLite for financial accuracy
        const totalDonationsRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM donations').get();
        const totalExpensesRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get();
        const countDonorsRow = db.prepare('SELECT COUNT(*) as count FROM donations').get();
        const countEventsRow = db.prepare("SELECT COUNT(*) as count FROM events WHERE status = 'PUBLISHED'").get();
        const countFoodRow = db.prepare('SELECT COUNT(*) as count FROM food_programs').get();

        const totalDonations = totalDonationsRow.total;
        const totalExpenses = totalExpensesRow.total;
        const currentBalance = totalDonations - totalExpenses;

        // Breakdown by payment method for donations
        const donationByMethod = db.prepare(`
            SELECT payment_method, COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
            FROM donations GROUP BY payment_method
        `).all();

        // Breakdown by expense category
        const expenseByCategory = db.prepare(`
            SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
            FROM expenses GROUP BY category ORDER BY total DESC
        `).all();

        // Recent activity
        const recentDonations = db.prepare('SELECT * FROM donations ORDER BY id DESC LIMIT 5').all();
        const recentExpenses = db.prepare('SELECT * FROM expenses ORDER BY id DESC LIMIT 5').all();

        res.json({
            publicVisible: true,
            totalDonations,
            totalExpenses,
            currentBalance,
            totalDonors: countDonorsRow.count,
            totalEvents: countEventsRow.count,
            totalFoodPrograms: countFoodRow.count,
            donationByMethod,
            expenseByCategory,
            recentDonations: req.session && req.session.admin ? recentDonations : recentDonations.map(d => ({ ...d, mobile: 'XXXXXXXXXX' })),
            recentExpenses
        });
    } catch (err) {
        console.error('Dashboard Stats Error:', err);
        res.status(500).json({ error: 'Failed to compute financial statistics' });
    }
});

module.exports = router;
