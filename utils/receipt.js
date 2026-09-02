const db = require('../database/database');

/**
 * Generates the next sequential receipt number format: AVVC-2026-XXXX
 */
function getNextReceiptNumber() {
    const prefix = 'AVVC-2026-';
    
    // Find highest numerical suffix matching prefix
    const row = db.prepare(`
        SELECT receipt_number FROM donations 
        WHERE receipt_number LIKE ? 
        ORDER BY id DESC LIMIT 1
    `).get(`${prefix}%`);

    let nextNumber = 1;
    if (row && row.receipt_number) {
        const parts = row.receipt_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
            nextNumber = lastSeq + 1;
        }
    }

    // Pad with leading zeros (e.g. 0001, 0002)
    const padded = String(nextNumber).padStart(4, '0');
    return `${prefix}${padded}`;
}

module.exports = {
    getNextReceiptNumber
};
