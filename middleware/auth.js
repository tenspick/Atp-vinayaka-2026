/**
 * Authentication Middleware
 */

function requireAuth(req, res, next) {
    if (req.session && req.session.admin) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Please log in to admin dashboard.' });
}

function requireSuperAdmin(req, res, next) {
    if (req.session && req.session.admin && req.session.admin.role === 'SUPER_ADMIN') {
        return next();
    }
    return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
}

module.exports = {
    requireAuth,
    requireSuperAdmin
};
