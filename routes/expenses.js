const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { logAuditAction } = require('../middleware/audit');

// GET /api/expenses (Admin & Public with setting check)
router.get('/', (req, res) => {
    try {
        const { category, search, date_from, date_to } = req.query;
        
        // Public check if public expenses allowed
        if (!req.session || !req.session.admin) {
            const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'public_expenses_detail'").get();
            if (!settingRow || settingRow.value !== 'ON') {
                return res.json({ expenses: [], message: 'Public detailed expenses viewing is turned off by committee.' });
            }
        }

        let query = 'SELECT * FROM expenses WHERE 1=1';
        const params = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        if (search) {
            query += ' AND (title LIKE ? OR paid_to LIKE ? OR description LIKE ?)';
            const s = `%${search.trim()}%`;
            params.push(s, s, s);
        }
        if (date_from) {
            query += ' AND expense_date >= ?';
            params.push(date_from);
        }
        if (date_to) {
            query += ' AND expense_date <= ?';
            params.push(date_to);
        }

        query += ' ORDER BY expense_date DESC, id DESC';

        const expenses = db.prepare(query).all(...params);
        res.json({ expenses });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

// GET /api/expenses/:id
router.get('/:id', (req, res) => {
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense record not found' });
    res.json({ expense });
});

// POST /api/expenses (Admin Only)
router.post('/', requireAuth, (req, res) => {
    const { title, category, description, amount, expense_date, paid_to, payment_method, reference_number, notes } = req.body;

    if (!title || !category || !amount) {
        return res.status(400).json({ error: 'Expense title, category, and amount are required.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid positive expense amount.' });
    }

    const expDate = expense_date || new Date().toISOString().split('T')[0];

    const stmt = db.prepare(`
        INSERT INTO expenses (title, category, description, amount, expense_date, paid_to, payment_method, reference_number, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        title.trim(),
        category,
        description || '',
        numericAmount,
        expDate,
        paid_to || '',
        payment_method || 'Cash',
        reference_number || '',
        notes || '',
        req.session.admin.username
    );

    logAuditAction(req.session.admin.id, req.session.admin.username, 'ADD_EXPENSE', 'expenses', result.lastInsertRowid, `Added ₹${numericAmount} for ${title}`);

    res.status(201).json({ message: 'Expense recorded successfully', id: result.lastInsertRowid });
});

// PUT /api/expenses/:id
router.put('/:id', requireAuth, (req, res) => {
    const { title, category, description, amount, expense_date, paid_to, payment_method, reference_number, notes } = req.body;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Expense record not found' });

    const numericAmount = amount !== undefined ? parseFloat(amount) : existing.amount;

    const stmt = db.prepare(`
        UPDATE expenses SET
            title = ?, category = ?, description = ?, amount = ?, expense_date = ?,
            paid_to = ?, payment_method = ?, reference_number = ?, notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);

    stmt.run(
        title ? title.trim() : existing.title,
        category || existing.category,
        description !== undefined ? description : existing.description,
        numericAmount,
        expense_date || existing.expense_date,
        paid_to !== undefined ? paid_to : existing.paid_to,
        payment_method || existing.payment_method,
        reference_number !== undefined ? reference_number : existing.reference_number,
        notes !== undefined ? notes : existing.notes,
        id
    );

    logAuditAction(req.session.admin.id, req.session.admin.username, 'UPDATE_EXPENSE', 'expenses', id, `Updated expense ${existing.title}`);

    res.json({ message: 'Expense record updated successfully' });
});

// DELETE /api/expenses/:id
router.delete('/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Expense record not found' });

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);

    logAuditAction(req.session.admin.id, req.session.admin.username, 'DELETE_EXPENSE', 'expenses', id, `Deleted ${existing.title} (₹${existing.amount})`);

    res.json({ message: 'Expense deleted successfully' });
});

module.exports = router;
