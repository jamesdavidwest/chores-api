require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initializeDatabase } = require("./data/init");
const authRoutes = require("./routes/auth");
const choresRoutes = require("./routes/chores");
const locationsRoutes = require("./routes/locations");
const usersRoutes = require("./routes/users");
const calendarRoutes = require("./routes/calendar"); // Added

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`Error at ${req.method} ${req.path}:`, err);
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: 'Invalid JSON in request body',
            path: req.path,
            method: req.method
        });
    }
    res.status(500).json({
        error: 'Internal Server Error',
        details: err.message,
        path: req.path,
        method: req.method
    });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chores", choresRoutes);
app.use("/api/locations", locationsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/calendar", calendarRoutes); // Added

// Initialize database
initializeDatabase();

// Basic route
app.get("/", (req, res) => {
    res.json({ message: "Chores API is running" });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        method: req.method
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});