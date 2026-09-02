const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { logAuditAction } = require('../middleware/audit');

// GET /api/food
router.get('/', (req, res) => {
    try {
        const foodPrograms = db.prepare('SELECT * FROM food_programs ORDER BY date ASC, start_time ASC').all();
        res.json({ foodPrograms });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch Annadanam programs' });
    }
});

// GET /api/food/:id
router.get('/:id', (req, res) => {
    const foodProgram = db.prepare('SELECT * FROM food_programs WHERE id = ?').get(req.params.id);
    if (!foodProgram) return res.status(404).json({ error: 'Annadanam program not found' });
    res.json({ foodProgram });
});

// POST /api/food (Admin Only)
router.post('/', requireAuth, (req, res) => {
    const { title, description, date, start_time, end_time, location, menu, sponsor, servings, status } = req.body;

    if (!title || !date) {
        return res.status(400).json({ error: 'Title and date are required.' });
    }

    const stmt = db.prepare(`
        INSERT INTO food_programs (title, description, date, start_time, end_time, location, menu, sponsor, servings, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        title.trim(),
        description || '',
        date,
        start_time || '',
        end_time || '',
        location || 'Ananthampalli Annadanam Hall',
        menu || '',
        sponsor || '',
        Number(servings) || 0,
        status || 'SCHEDULED',
        req.session.admin.username
    );

    logAuditAction(req.session.admin.id, req.session.admin.username, 'ADD_FOOD', 'food_programs', result.lastInsertRowid, title);

    res.status(201).json({ message: 'Annadanam food program added successfully', id: result.lastInsertRowid });
});

// PUT /api/food/:id
router.put('/:id', requireAuth, (req, res) => {
    const { title, description, date, start_time, end_time, location, menu, sponsor, servings, status } = req.body;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM food_programs WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Annadanam program not found' });

    const stmt = db.prepare(`
        UPDATE food_programs SET
            title = ?, description = ?, date = ?, start_time = ?, end_time = ?,
            location = ?, menu = ?, sponsor = ?, servings = ?, status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);

    stmt.run(
        title ? title.trim() : existing.title,
        description !== undefined ? description : existing.description,
        date || existing.date,
        start_time !== undefined ? start_time : existing.start_time,
        end_time !== undefined ? end_time : existing.end_time,
        location !== undefined ? location : existing.location,
        menu !== undefined ? menu : existing.menu,
        sponsor !== undefined ? sponsor : existing.sponsor,
        servings !== undefined ? Number(servings) : existing.servings,
        status || existing.status,
        id
    );

    logAuditAction(req.session.admin.id, req.session.admin.username, 'UPDATE_FOOD', 'food_programs', id, title || existing.title);

    res.json({ message: 'Annadanam food program updated successfully' });
});

// DELETE /api/food/:id
router.delete('/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM food_programs WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Annadanam program not found' });

    db.prepare('DELETE FROM food_programs WHERE id = ?').run(id);

    logAuditAction(req.session.admin.id, req.session.admin.username, 'DELETE_FOOD', 'food_programs', id, existing.title);

    res.json({ message: 'Annadanam food program deleted successfully' });
});

module.exports = router;
