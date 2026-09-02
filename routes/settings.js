const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const { logAuditAction } = require('../middleware/audit');

// GET /api/settings (Public & Admin)
router.get('/', (req, res) => {
    try {
        const rows = db.prepare('SELECT key, value FROM settings').all();
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json({ settings });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch festival settings' });
    }
});

// PUT /api/settings (Admin Only)
router.put('/', requireAuth, (req, res) => {
    try {
        const settingsObj = req.body;
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

        const updateTransaction = db.transaction((data) => {
            for (const [key, value] of Object.entries(data)) {
                stmt.run(key, String(value));
            }
        });

        updateTransaction(settingsObj);

        logAuditAction(req.session.admin.id, req.session.admin.username, 'SETTINGS_UPDATE', 'settings', '0', 'Updated festival configuration settings');

        res.json({ message: 'Settings saved successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
