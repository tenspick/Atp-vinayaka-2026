require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers & CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Session Setup (Stateless & Vercel Serverless Ready)
app.use(cookieSession({
    name: 'avvc_admin_session',
    keys: [process.env.SESSION_SECRET || 'avvc_2026_ananthampalli_secret_key_98765'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
}));

// Serve Static Frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Mount API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/food', require('./routes/food'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/donators', require('./routes/donators'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/export', require('./routes/export'));
app.use('/api/audit', require('./routes/audit'));

// Admin Database Backup Download Endpoint (Admin Only)
app.get('/api/admin/backup-db', (req, res) => {
    if (!req.session || !req.session.admin) {
        return res.status(401).send('Unauthorized');
    }
    const dbFile = path.join(__dirname, 'database', 'festival.sqlite');
    if (fs.existsSync(dbFile)) {
        res.download(dbFile, `festival_backup_${new Date().toISOString().split('T')[0]}.sqlite`);
    } else {
        res.status(404).send('Database file not found');
    }
});

// Fallback Route for SPA navigation on public and admin pages
app.get('/admin*', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start Server if executed directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
============================================================
  ANANTHAMPALLI VILLAGE VINAYAKA CHAVITHI 2026 (AVVC 2026)
  Server running successfully at: http://localhost:${PORT}
  Admin Portal: http://localhost:${PORT}/admin/login.html
============================================================
        `);
    });
}

module.exports = app;
