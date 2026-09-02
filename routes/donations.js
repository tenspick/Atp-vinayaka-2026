const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');
const { logAuditAction } = require('../middleware/audit');
const { getNextReceiptNumber } = require('../utils/receipt');
const { generateWhatsAppReceiptUrl } = require('../utils/whatsapp');

// GET /api/donations (Admin & Public filtered)
router.get('/', (req, res) => {
    try {
        const { search, payment_method, date_from, date_to, limit, offset } = req.query;
        let query = 'SELECT * FROM donations WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (donor_name LIKE ? OR mobile LIKE ? OR receipt_number LIKE ? OR sponsorship_title LIKE ?)';
            const s = `%${search.trim()}%`;
            params.push(s, s, s, s);
        }
        if (payment_method) {
            query += ' AND payment_method = ?';
            params.push(payment_method);
        }
        if (date_from) {
            query += ' AND date >= ?';
            params.push(date_from);
        }
        if (date_to) {
            query += ' AND date <= ?';
            params.push(date_to);
        }

        query += ' ORDER BY id DESC';

        if (limit) {
            query += ' LIMIT ?';
            params.push(Number(limit));
            if (offset) {
                query += ' OFFSET ?';
                params.push(Number(offset));
            }
        }

        const donations = db.prepare(query).all(...params);

        // Sanitize for public if unauthenticated
        if (!req.session || !req.session.admin) {
            const sanitized = donations.map(d => ({
                id: d.id,
                receipt_number: d.receipt_number,
                donor_name: d.is_anonymous ? 'Anonymous Donor' : d.donor_name,
                sponsorship_title: d.sponsorship_title || '',
                amount: d.amount,
                date: d.date,
                payment_method: d.payment_method
            }));
            return res.json({ donations: sanitized });
        }

        res.json({ donations });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch donations' });
    }
});

// GET /api/donations/receipt-next (Get next auto sequential receipt number)
router.get('/receipt-next', requireAuth, (req, res) => {
    const nextReceipt = getNextReceiptNumber();
    res.json({ nextReceipt });
});

// GET /api/donations/:id
router.get('/:id', (req, res) => {
    const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
    if (!donation) return res.status(404).json({ error: 'Donation record not found' });

    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settingsMap = {};
    settingsRows.forEach(r => settingsMap[r.key] = r.value);

    // Ensure collected_by shows a friendly full name instead of email
    if (donation.collected_by && donation.collected_by.includes('@')) {
        if (donation.collected_by.includes('surya')) {
            donation.collected_by = 'Surya Mohan Reddy';
        } else if (donation.collected_by.includes('sunny')) {
            donation.collected_by = 'Yaddala Ranjith Goud (Sunny)';
        }
    }

    const whatsappUrl = generateWhatsAppReceiptUrl(donation, settingsMap);

    res.json({ donation, whatsappUrl, settings: settingsMap });
});

// POST /api/donations (Admin Only - Collect Chandaa & Special Sponsorships)
router.post('/', requireAuth, (req, res) => {
    const { donor_name, mobile, date, amount, payment_method, transaction_reference, sponsorship_title, notes, is_anonymous } = req.body;

    if (!donor_name || !mobile || !amount) {
        return res.status(400).json({ error: 'Donor name, mobile number, and donation amount are required.' });
    }

    const cleanedMobile = String(mobile).replace(/\D/g, '');
    if (cleanedMobile.length < 10) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid positive donation amount.' });
    }

    const receiptNumber = getNextReceiptNumber();
    const donationDate = date || new Date().toISOString().split('T')[0];

    const collectorName = req.session.admin.full_name || req.session.admin.username;

    const stmt = db.prepare(`
        INSERT INTO donations (receipt_number, donor_name, mobile, date, amount, payment_method, transaction_reference, sponsorship_title, notes, collected_by, is_anonymous)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        receiptNumber,
        donor_name.trim(),
        cleanedMobile,
        donationDate,
        numericAmount,
        payment_method || 'Cash',
        transaction_reference || '',
        sponsorship_title ? sponsorship_title.trim() : '',
        notes || '',
        collectorName,
        is_anonymous ? 1 : 0
    );

    const donationId = result.lastInsertRowid;

    const newDonation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId);
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settingsMap = {};
    settingsRows.forEach(r => settingsMap[r.key] = r.value);

    const whatsappUrl = generateWhatsAppReceiptUrl(newDonation, settingsMap);

    logAuditAction(req.session.admin.id, req.session.admin.username, 'ADD_DONATION', 'donations', donationId, `Added ₹${numericAmount} for ${donor_name} (${sponsorship_title ? 'Sponsor: ' + sponsorship_title : receiptNumber})`);

    res.status(201).json({
        message: 'Donation collected successfully',
        id: donationId,
        receipt_number: receiptNumber,
        donation: newDonation,
        whatsappUrl
    });
});

// PUT /api/donations/:id
router.put('/:id', requireAuth, (req, res) => {
    const { donor_name, mobile, date, amount, payment_method, transaction_reference, sponsorship_title, notes, is_anonymous } = req.body;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM donations WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Donation not found' });

    db.prepare(`
        UPDATE donations 
        SET donor_name = ?, mobile = ?, date = ?, amount = ?, payment_method = ?, transaction_reference = ?, sponsorship_title = ?, notes = ?, is_anonymous = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(
        donor_name.trim(),
        mobile,
        date,
        parseFloat(amount),
        payment_method,
        transaction_reference || '',
        sponsorship_title || '',
        notes || '',
        is_anonymous ? 1 : 0,
        id
    );

    logAuditAction(req.session.admin.id, req.session.admin.username, 'UPDATE_DONATION', 'donations', id, `Updated donation #${id}`);

    res.json({ message: 'Donation updated successfully' });
});

// DELETE /api/donations/:id
router.delete('/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM donations WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Donation record not found' });

    db.prepare('DELETE FROM donations WHERE id = ?').run(id);

    logAuditAction(req.session.admin.id, req.session.admin.username, 'DELETE_DONATION', 'donations', id, `Deleted receipt ${existing.receipt_number}`);

    res.json({ message: 'Donation deleted successfully' });
});

module.exports = router;
