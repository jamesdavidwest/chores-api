const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const schemas = require('../schemas/validation.schemas');

// Public routes
router.post('/login', validate(schemas.login), authController.login.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));

// Protected routes
router.post('/logout', authenticate, authController.logout.bind(authController));
router.post('/change-password', 
    authenticate, 
    validate(schemas.changePassword),
    authController.changePassword.bind(authController)
);

module.exports = router;