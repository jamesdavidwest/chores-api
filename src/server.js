require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Import routes
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/locations');
const userRoutes = require('./routes/users');
const calendarRoutes = require('./routes/calendar');
const categoryRoutes = require('./routes/categories');
const rewardRoutes = require('./routes/rewards');
const notificationRoutes = require('./routes/notifications');
const errorHandler = require('./middleware/errorHandler');

// Verify .env configuration
console.log('Environment Check:', {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    jwtSecretLength: process.env.JWT_SECRET?.length || 'NOT SET'
});

// Verify database exists
const DB_PATH = path.join(__dirname, '../data/chores.db');

// Test database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

db.close();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(bodyParser.json());

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Tasks API is running' });
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const db = new sqlite3.Database(DB_PATH);
        
        db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
            db.close();
            
            if (err) {
                return res.json({ 
                    status: 'error',
                    timestamp: new Date().toISOString(),
                    database: 'error',
                    error: err.message
                });
            }

            res.json({ 
                status: 'ok',
                timestamp: new Date().toISOString(),
                database: 'connected',
                tables_accessible: true,
                user_count: row ? row.count : 0,
                env: {
                    nodeEnv: process.env.NODE_ENV,
                    hasJwtSecret: !!process.env.JWT_SECRET
                }
            });
        });
    } catch (error) {
        res.json({ 
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'error',
            error: error.message
        });
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/notifications', notificationRoutes);

// Options pre-flight
app.options('*', cors(corsOptions));

// Error handling middleware
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server starting...`);
        console.log(`Current working directory: ${process.cwd()}`);
        console.log(`Database path: ${DB_PATH}`);
        console.log(`Server running on port ${PORT}`);
        console.log(`CORS enabled for: ${corsOptions.origin.join(', ')}`);
        console.log(`Try accessing: http://localhost:${PORT}/health`);
    });
}

module.exports = app;