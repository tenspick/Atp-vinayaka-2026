const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/database');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const { logAuditAction } = require('../middleware/audit');

// GET /api/admins (Super Admin Only)
router.get('/', requireSuperAdmin, (req, res) => {
    try {
        const admins = db.prepare('SELECT id, username, role, is_active, created_at, updated_at FROM admins ORDER BY id ASC').all();
        res.json({ admins });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch admin accounts' });
    }
});

// POST /api/admins (Super Admin Only - Add new admin)
router.post('/', requireSuperAdmin, (req, res) => {
    const { username, password, full_name, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const cleanUser = username.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(cleanUser);
    if (existing) {
        return res.status(400).json({ error: 'Username already exists.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(`
        INSERT INTO admins (username, full_name, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, 1)
    `);

    const result = stmt.run(cleanUser, full_name ? full_name.trim() : cleanUser, hash, role || 'ADMIN');

    logAuditAction(req.session.admin.id, req.session.admin.username, 'ADD_ADMIN', 'admins', result.lastInsertRowid, cleanUser);

    res.status(201).json({ message: 'Admin created successfully', id: result.lastInsertRowid });
});

// PUT /api/admins/:id/toggle (Enable/Disable Admin)
router.put('/:id/toggle', requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(id);

    if (!admin) return res.status(404).json({ error: 'Admin account not found.' });

    // Prevent disabling self
    if (admin.id === req.session.admin.id) {
        return res.status(400).json({ error: 'You cannot disable your own admin account.' });
    }

    // Ensure at least 1 active super admin remains
    if (admin.role === 'SUPER_ADMIN' && admin.is_active === 1) {
        const superCount = db.prepare('SELECT COUNT(*) as count FROM admins WHERE role = "SUPER_ADMIN" AND is_active = 1').get().count;
        if (superCount <= 1) {
            return res.status(400).json({ error: 'At least one active Super Admin must remain in the system.' });
        }
    }

    const newStatus = admin.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE admins SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);

    logAuditAction(req.session.admin.id, req.session.admin.username, 'TOGGLE_ADMIN', 'admins', id, `${admin.username} set to ${newStatus ? 'ACTIVE' : 'DISABLED'}`);

    res.json({ message: `Admin status changed to ${newStatus ? 'Active' : 'Disabled'}` });
});

// PUT /api/admins/:id/reset-password
router.put('/:id/reset-password', requireSuperAdmin, (req, res) => {
    const { newPassword } = req.body;
    const { id } = req.params;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(id);
    if (!admin) return res.status(404).json({ error: 'Admin account not found.' });

    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, id);

    logAuditAction(req.session.admin.id, req.session.admin.username, 'RESET_ADMIN_PASSWORD', 'admins', id, `Reset password for ${admin.username}`);

    res.json({ message: `Password reset successfully for ${admin.username}` });
});

// DELETE /api/admins/:id
router.delete('/:id', requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(id);

    if (!admin) return res.status(404).json({ error: 'Admin account not found.' });
    if (admin.id === req.session.admin.id) {
        return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    db.prepare('DELETE FROM admins WHERE id = ?').run(id);

    logAuditAction(req.session.admin.id, req.session.admin.username, 'DELETE_ADMIN', 'admins', id, admin.username);

    res.json({ message: 'Admin account deleted successfully.' });
});

module.exports = router;
