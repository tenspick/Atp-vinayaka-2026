const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');

// GET /api/audit (Admin Only - Fetch committee audit logs)
router.get('/', requireAuth, (req, res) => {
    try {
        const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100').all();
        res.json({ logs });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

module.exports = router;
