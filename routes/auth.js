const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { logAuditAction } = require('../middleware/audit');

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const inputUser = String(username).trim().toLowerCase();
        const admin = db.prepare('SELECT * FROM admins WHERE LOWER(username) = ?').get(inputUser);

        if (!admin || !admin.is_active) {
            return res.status(401).json({ error: 'Invalid username or account disabled.' });
        }

        const isMatch = bcrypt.compareSync(password, admin.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid password.' });
        }

        // Determine friendly full name for receipt collector display
        let fullName = admin.full_name;
        if (!fullName) {
            if (inputUser.includes('surya') || inputUser === 'admin01') {
                fullName = 'Surya Mohan Reddy';
            } else if (inputUser.includes('sunny') || inputUser === 'admin02') {
                fullName = 'Yaddala Ranjith Goud (Sunny)';
            } else {
                fullName = admin.username;
            }
        }

        // Set session
        req.session.admin = {
            id: admin.id,
            username: admin.username,
            full_name: fullName,
            role: admin.role
        };

        logAuditAction(admin.id, admin.username, 'LOGIN', 'auth', admin.id, 'Logged in successfully');

        return res.json({
            message: 'Login successful',
            user: {
                id: admin.id,
                username: admin.username,
                full_name: fullName,
                role: admin.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Database authentication error. Please try again.' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    if (req.session && req.session.admin) {
        logAuditAction(req.session.admin.id, req.session.admin.username, 'LOGOUT', 'auth', req.session.admin.id, 'Logged out');
    }
    req.session = null;
    return res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    if (req.session && req.session.admin) {
        return res.json({
            authenticated: true,
            user: req.session.admin
        });
    }
    return res.json({ authenticated: false });
});

// PUT /api/auth/change-password
router.put('/change-password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.session.admin.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
    if (!admin) {
        return res.status(404).json({ error: 'Admin account not found.' });
    }

    const isMatch = bcrypt.compareSync(currentPassword, admin.password_hash);
    if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, adminId);

    logAuditAction(admin.id, admin.username, 'CHANGE_PASSWORD', 'admins', admin.id, 'Password updated');

    return res.json({ message: 'Password changed successfully.' });
});

module.exports = router;
