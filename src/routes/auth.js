const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const UserService = require('../services/UserService');
const { authenticate } = require('../middleware/auth');
const { validateLogin, validateProfileUpdate } = require('../middleware/validation/userValidator');

const userService = new UserService();

// Login route with validation
router.post('/login', validateLogin, async (req, res, next) => {
    try {
        const { email, password } = req.validatedData;

        const user = await userService.validateCredentials(email, password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { 
                id: user.id,
                role: user.role,
                name: user.name
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user });
    } catch (error) {
        next(error);
    }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.user.id, true);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
});

// Update user profile with validation
router.put('/profile', authenticate, validateProfileUpdate, async (req, res, next) => {
    try {
        const updatedUser = await userService.updateUser(req.user.id, req.validatedData);
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(updatedUser);
    } catch (error) {
        next(error);
    }
});

// Verify token is valid
router.post('/verify', authenticate, (req, res) => {
    res.json({ valid: true, user: req.user });
});

module.exports = router;