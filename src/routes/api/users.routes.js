// src/routes/api/users.routes.js
const express = require('express');
const router = express.Router();
const { validateSchema } = require('../../middleware/validation/schemaValidator');
const userSchemas = require('../../schemas/user.schema');
const UserController = require('../../controllers/user.controller');
const authMiddleware = require('../../middleware/auth');
const AppError = require('../../utils/AppError.js');

// Initialize controller
const userController = new UserController();

// Public routes

// POST /api/v1/users/register
router.post('/register', validateSchema(userSchemas.registerUser), async (req, res, next) => {
  try {
    const user = await userController.register(req.body);
    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/users/login
router.post('/login', validateSchema(userSchemas.loginUser), async (req, res, next) => {
  try {
    const authData = await userController.login(req.body);
    res.json({
      success: true,
      data: authData,
    });
  } catch (error) {
    next(error);
  }
});

// Protected routes (require authentication)
router.use(authMiddleware);

// GET /api/v1/users
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    const users = await userController.list(parseInt(page), parseInt(limit), filters);
    res.json({
      success: true,
      data: users.data,
      metadata: {
        pagination: users.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const user = await userController.getById(req.params.id);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/users/:id
router.put('/:id', validateSchema(userSchemas.updateUser), async (req, res, next) => {
  try {
    // Check if user is updating their own profile or is admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Not authorized to update this user');
    }
    const user = await userController.update(req.params.id, req.body);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/users/:id
router.delete('/:id', async (req, res, next) => {
  try {
    // Check if user is deleting their own account or is admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Not authorized to delete this user');
    }
    await userController.delete(req.params.id);
    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/users/logout
router.post('/logout', async (req, res, next) => {
  try {
    await userController.logout(req.user.id);
    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/users/refresh-token
router.post('/refresh-token', validateSchema(userSchemas.refreshToken), async (req, res, next) => {
  try {
    const authData = await userController.refreshToken(req.body.refreshToken);
    res.json({
      success: true,
      data: authData,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/users/forgot-password
router.post(
  '/forgot-password',
  validateSchema(userSchemas.forgotPassword),
  async (req, res, next) => {
    try {
      await userController.forgotPassword(req.body.email);
      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/users/reset-password
router.post(
  '/reset-password',
  validateSchema(userSchemas.resetPassword),
  async (req, res, next) => {
    try {
      await userController.resetPassword(req.body.token, req.body.newPassword);
      res.json({
        success: true,
        message: 'Password has been reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/users/verify-email/:token
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    await userController.verifyEmail(req.params.token);
    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/users/resend-verification
router.post(
  '/resend-verification',
  validateSchema(userSchemas.resendVerification),
  async (req, res, next) => {
    try {
      await userController.resendVerificationEmail(req.body.email);
      res.json({
        success: true,
        message:
          'If your email is registered and unverified, a new verification email has been sent',
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
