const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        console.log('Authentication failed: No authorization header');
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token verified successfully for user:', {
            userId: decoded.id,
            userName: decoded.name,
            userRole: decoded.role
        });
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification failed:', {
            error: error.message,
            token: token ? '[PRESENT]' : '[MISSING]'
        });
        res.status(401).json({ error: 'Invalid token' });
    }
};

const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            console.log('Authorization failed: No user in request');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (roles.length && !roles.includes(req.user.role)) {
            console.log('Authorization failed: Invalid role', {
                userRole: req.user.role,
                requiredRoles: roles
            });
            return res.status(403).json({ error: 'Forbidden' });
        }

        console.log('Authorization successful for user:', {
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role
        });
        next();
    };
};

module.exports = { authenticate, authorize };