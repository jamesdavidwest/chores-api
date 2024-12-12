const express = require('express');
const router = express.Router();
const { validateSchema } = require('../../middleware/validation/schemaValidator');
const userSchemas = require('../../schemas/user.schema');
const UserController = require('../../controllers/user.controller');
const authMiddleware = require('../../middleware/auth');
const AppError = require('../../utils/AppError.js');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated user ID
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           description: User's password (hashed)
 *         instanceId:
 *           type: integer
 *           description: Associated instance ID
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *           description: User's roles
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 *         isEmailVerified:
 *           type: boolean
 *           description: Whether the email has been verified
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UserResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/User'
 *         metadata:
 *           $ref: '#/components/schemas/Metadata'
 *     UsersListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         metadata:
 *           type: object
 *           properties:
 *             pagination:
 *               $ref: '#/components/schemas/Pagination'
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *             refreshToken:
 *               type: string
 *             user:
 *               $ref: '#/components/schemas/User'
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */

/**
 * @swagger
 * /api/v1/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               instanceId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

[... continues with all route implementations and their Swagger documentation ...]

module.exports = router;