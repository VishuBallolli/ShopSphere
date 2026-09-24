const authorizeRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    next();
  };
};

module.exports = authorizeRole;