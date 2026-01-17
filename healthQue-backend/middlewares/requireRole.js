module.exports = function requireRole(roles) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Missing authentication' });
    const current = req.user.role;
    if (!roles) return next();
    if (Array.isArray(roles)) {
      if (!roles.includes(current)) return res.status(403).json({ error: 'Forbidden' });
    } else {
      if (current !== roles) return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
