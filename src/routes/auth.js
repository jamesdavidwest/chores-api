const express = require("express");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs").promises;

const router = express.Router();

// Helper function to read database
async function readDatabase() {
    const dbPath = path.join(__dirname, '../../data/database.json');
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        throw error;
    }
}

// Login
router.post("/login", async (req, res) => {
    try {
        console.log('Login attempt:', req.body);
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        // Read the database file
        const db = await readDatabase();
        
        // Find user by username and password
        const user = db.users.find(u => 
            u.name.toLowerCase() === username.toLowerCase() && 
            u.password === password
        );

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Create and sign JWT
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: "24h" }
        );

        console.log('Login successful for user:', { id: user.id, name: user.name, role: user.role });

        // Return user info and token
        res.json({ 
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get current user
router.get("/me", async (req, res) => {
    try {
        // Get token from header
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Read database
        const db = await readDatabase();
        
        // Find user
        const user = db.users.find(u => u.id === decoded.id);
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Return user info (excluding password)
        res.json({
            id: user.id,
            name: user.name,
            role: user.role
        });
    } catch (error) {
        console.error('Auth error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid token" });
        }
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;