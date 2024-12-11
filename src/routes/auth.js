const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const UserService = require("../services/UserService");
const { authenticate } = require("../middleware/auth");
const { validateLogin, validateProfileUpdate } = require("../middleware/validation/userValidator");

const userService = new UserService();

// Login route with enhanced logging
router.post("/login", validateLogin, async (req, res, next) => {
    console.log('Login attempt received:', {
        body: {...req.body, password: '[REDACTED]'},
        validatedData: {...req.validatedData, password: '[REDACTED]'}
    });
    
    try {
        const { email, password } = req.validatedData;
        console.log('Attempting to validate credentials for:', email);

        const user = await userService.validateCredentials(email, password);
        console.log('User validation result:', user ? 'Success' : 'Failed', {
            userId: user?.id,
            userName: user?.name,
            userRole: user?.role
        });
        
        if (!user) {
            console.log('Login failed: Invalid credentials for:', email);
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

        console.log('Login successful:', {
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            tokenGenerated: true
        });

        res.json({ token, user });
    } catch (error) {
        console.error('Login error:', {
            error: error.message,
            stack: error.stack,
            email: req.validatedData?.email
        });
        next(error);
    }
});

// Get current user (/me endpoint)
router.get("/me", authenticate, async (req, res, next) => {
    try {
        console.log('Fetching current user profile:', req.user.id);
        const user = await userService.getUserById(req.user.id);
        
        if (!user) {
            console.log('User not found:', req.user.id);
            return res.status(404).json({ error: "User not found" });
        }

        // Remove sensitive data
        delete user.password_hash;
        
        console.log('User profile fetched successfully:', {
            userId: user.id,
            userName: user.name,
            userRole: user.role
        });
        
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', {
            userId: req.user?.id,
            error: error.message,
            stack: error.stack
        });
        next(error);
    }
});

// Get user profile
router.get("/profile", authenticate, async (req, res, next) => {
    try {
        console.log('Fetching profile for user:', req.user.id);
        const user = await userService.getUserById(req.user.id, true);
        if (!user) {
            console.log('Profile not found for user:', req.user.id);
            return res.status(404).json({ error: "User not found" });
        }
        console.log('Profile fetched successfully for user:', req.user.id);
        res.json(user);
    } catch (error) {
        console.error('Profile fetch error:', {
            userId: req.user?.id,
            error: error.message,
            stack: error.stack
        });
        next(error);
    }
});

// Update user profile with validation
router.put("/profile", authenticate, validateProfileUpdate, async (req, res, next) => {
    try {
        console.log('Profile update requested for user:', req.user.id, {
            updates: {...req.validatedData, password: req.validatedData.password ? '[REDACTED]' : undefined}
        });
        
        const updatedUser = await userService.updateUser(req.user.id, req.validatedData);
        if (!updatedUser) {
            console.log('Profile update failed - user not found:', req.user.id);
            return res.status(404).json({ error: "User not found" });
        }
        
        console.log('Profile updated successfully for user:', req.user.id);
        res.json(updatedUser);
    } catch (error) {
        console.error('Profile update error:', {
            userId: req.user?.id,
            error: error.message,
            stack: error.stack
        });
        next(error);
    }
});

// Verify token is valid
router.post("/verify", authenticate, (req, res) => {
    console.log('Token verification successful for user:', req.user.id);
    res.json({ valid: true, user: req.user });
});

// Debug endpoint for development
router.get("/debug", async (req, res) => {
    try {
        console.log('Debug endpoint accessed');
        const dbState = await userService.debugDatabase();
        console.log('Debug database state:', dbState);
        res.json(dbState);
    } catch (error) {
        console.error('Debug endpoint error:', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;