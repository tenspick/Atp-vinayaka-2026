const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { convertToCSV } = require('../utils/csv');

// GET /api/export/donations (Admin CSV Download)
router.get('/donations', requireAuth, (req, res) => {
    try {
        const donations = db.prepare(`
            SELECT receipt_number, donor_name, mobile, date, amount, payment_method, 
                   transaction_reference, notes, collected_by, is_anonymous, created_at
            FROM donations ORDER BY id DESC
        `).all();

        const csv = convertToCSV(donations);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="AVVC_2026_Donations.csv"');
        res.send(csv);
    } catch (err) {
        res.status(500).send('Failed to generate CSV export');
    }
});

// GET /api/export/expenses (Admin CSV Download)
router.get('/expenses', requireAuth, (req, res) => {
    try {
        const expenses = db.prepare(`
            SELECT id, title, category, description, amount, expense_date, 
                   paid_to, payment_method, reference_number, notes, created_by, created_at
            FROM expenses ORDER BY expense_date DESC
        `).all();

        const csv = convertToCSV(expenses);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="AVVC_2026_Expenses.csv"');
        res.send(csv);
    } catch (err) {
        res.status(500).send('Failed to generate CSV export');
    }
});

// GET /api/export/audit-logs (Admin Only)
router.get('/audit-logs', requireAuth, (req, res) => {
    try {
        const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500').all();
        res.json({ logs });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

module.exports = router;
