const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const UserService = require("../services/UserService");
const { authenticate } = require("../middleware/auth");
const {
  validateLogin,
  validateProfileUpdate,
} = require("../middleware/validation/userValidator");

const userService = new UserService();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: User's unique identifier
 *         name:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         role:
 *           type: string
 *           enum: [user, admin, manager]
 *           description: User's role in the system
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     LoginCredentials:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: "********"
 *     TokenResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT access token
 *         user:
 *           $ref: '#/components/schemas/UserProfile'
 */

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and profile management
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user and get JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginCredentials'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", validateLogin, async (req, res, next) => {
  console.log("Login attempt received:", {
    body: { ...req.body, password: "[REDACTED]" },
    validatedData: { ...req.validatedData, password: "[REDACTED]" },
  });

  try {
    const { email, password } = req.validatedData;
    console.log("Attempting to validate credentials for:", email);

    const user = await userService.validateCredentials(email, password);
    console.log("User validation result:", user ? "Success" : "Failed", {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
    });

    if (!user) {
      console.log("Login failed: Invalid credentials for:", email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    console.log("Login successful:", {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      tokenGenerated: true,
    });

    res.json({ token, user });
  } catch (error) {
    console.error("Login error:", {
      error: error.message,
      stack: error.stack,
      email: req.validatedData?.email,
    });
    next(error);
  }
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me", authenticate, async (req, res, next) => {
  try {
    console.log("Fetching current user profile:", req.user.id);
    const user = await userService.getUserById(req.user.id);

    if (!user) {
      console.log("User not found:", req.user.id);
      return res.status(404).json({ error: "User not found" });
    }

    // Remove sensitive data
    delete user.password_hash;

    console.log("User profile fetched successfully:", {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
    });

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
});

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get user's detailed profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's detailed profile information
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/UserProfile'
 *                 - type: object
 *                   properties:
 *                     preferences:
 *                       type: object
 *                       description: User preferences and settings
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/profile", authenticate, async (req, res, next) => {
  try {
    console.log("Fetching profile for user:", req.user.id);
    const user = await userService.getUserById(req.user.id, true);
    if (!user) {
      console.log("Profile not found for user:", req.user.id);
      return res.status(404).json({ error: "User not found" });
    }
    console.log("Profile fetched successfully for user:", req.user.id);
    res.json(user);
  } catch (error) {
    console.error("Profile fetch error:", {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
});

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: New password (optional)
 *               preferences:
 *                 type: object
 *                 description: User preferences
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/profile",
  authenticate,
  validateProfileUpdate,
  async (req, res, next) => {
    try {
      console.log("Profile update requested for user:", req.user.id, {
        updates: {
          ...req.validatedData,
          password: req.validatedData.password ? "[REDACTED]" : undefined,
        },
      });

      const updatedUser = await userService.updateUser(
        req.user.id,
        req.validatedData
      );
      if (!updatedUser) {
        console.log("Profile update failed - user not found:", req.user.id);
        return res.status(404).json({ error: "User not found" });
      }

      console.log("Profile updated successfully for user:", req.user.id);
      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  }
);

/**
 * @swagger
 * /auth/verify:
 *   post:
 *     summary: Verify JWT token validity
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post("/verify", authenticate, (req, res) => {
  console.log("Token verification successful for user:", req.user.id);
  res.json({ valid: true, user: req.user });
});

/**
 * @swagger
 * /auth/debug:
 *   get:
 *     summary: Get debug information (development only)
 *     tags: [Authentication]
 *     description: Development endpoint to get database state information
 *     responses:
 *       200:
 *         description: Debug information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserProfile'
 *                 stats:
 *                   type: object
 *                   description: Database statistics
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/debug", async (req, res) => {
  try {
    console.log("Debug endpoint accessed");
    const dbState = await userService.debugDatabase();
    console.log("Debug database state:", dbState);
    res.json(dbState);
  } catch (error) {
    console.error("Debug endpoint error:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
});

module.exports = router;
