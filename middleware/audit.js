const db = require('../database/database');

function logAuditAction(adminId, adminUsername, action, entity, entityId, details) {
    try {
        const stmt = db.prepare(`
            INSERT INTO audit_logs (admin_id, admin_username, action, entity, entity_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(adminId || null, adminUsername || 'System', action, entity, String(entityId || ''), String(details || ''));
    } catch (err) {
        console.error('Audit Logging Error:', err);
    }
}

module.exports = {
    logAuditAction
};
