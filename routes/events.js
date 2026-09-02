const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { logAuditAction } = require('../middleware/audit');

// GET /api/events (Public & Admin)
router.get('/', (req, res) => {
    try {
        const { category, status } = req.query;
        let query = 'SELECT * FROM events WHERE 1=1';
        const params = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        } else if (!req.session || !req.session.admin) {
            // Default public only sees published events
            query += " AND status = 'PUBLISHED'";
        }

        query += ' ORDER BY event_date ASC, start_time ASC, display_order ASC';
        const events = db.prepare(query).all(...params);

        res.json({ events });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// GET /api/events/:id
router.get('/:id', (req, res) => {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ event });
});

// POST /api/events (Admin Only)
router.post('/', requireAuth, (req, res) => {
    const { title, description, event_date, start_time, end_time, location, category, image, status, display_order } = req.body;

    if (!title || !event_date) {
        return res.status(400).json({ error: 'Title and event date are required.' });
    }

    const stmt = db.prepare(`
        INSERT INTO events (title, description, event_date, start_time, end_time, location, category, image, status, display_order, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        title.trim(),
        description || '',
        event_date,
        start_time || '',
        end_time || '',
        location || 'Ananthampalli Main Mandap',
        category || 'Pooja',
        image || '',
        status || 'PUBLISHED',
        Number(display_order) || 0,
        req.session.admin.username
    );

    logAuditAction(req.session.admin.id, req.session.admin.username, 'ADD_EVENT', 'events', result.lastInsertRowid, title);

    res.status(201).json({ message: 'Event added successfully', id: result.lastInsertRowid });
});

// PUT /api/events/:id (Admin Only)
router.put('/:id', requireAuth, (req, res) => {
    const { title, description, event_date, start_time, end_time, location, category, image, status, display_order } = req.body;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    const stmt = db.prepare(`
        UPDATE events SET
            title = ?, description = ?, event_date = ?, start_time = ?, end_time = ?,
            location = ?, category = ?, image = ?, status = ?, display_order = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);

    stmt.run(
        title ? title.trim() : existing.title,
        description !== undefined ? description : existing.description,
        event_date || existing.event_date,
        start_time !== undefined ? start_time : existing.start_time,
        end_time !== undefined ? end_time : existing.end_time,
        location !== undefined ? location : existing.location,
        category || existing.category,
        image !== undefined ? image : existing.image,
        status || existing.status,
        display_order !== undefined ? Number(display_order) : existing.display_order,
        id
    );

    logAuditAction(req.session.admin.id, req.session.admin.username, 'UPDATE_EVENT', 'events', id, title || existing.title);

    res.json({ message: 'Event updated successfully' });
});

// DELETE /api/events/:id (Admin Only)
router.delete('/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    db.prepare('DELETE FROM events WHERE id = ?').run(id);

    logAuditAction(req.session.admin.id, req.session.admin.username, 'DELETE_EVENT', 'events', id, existing.title);

    res.json({ message: 'Event deleted successfully' });
});

module.exports = router;
