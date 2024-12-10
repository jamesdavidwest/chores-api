const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Import routes
const choreRoutes = require('./routes/chores');
const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/locations');
const userRoutes = require('./routes/users');
const calendarRoutes = require('./routes/calendar');
const categoryRoutes = require('./routes/categories');
const rewardRoutes = require('./routes/rewards');
const notificationRoutes = require('./routes/notifications');
const errorHandler = require('./middleware/errorHandler');

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

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Chores API is running' });
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
                user_count: row ? row.count : 0
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
app.use('/api/chores', choreRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server starting...`);
        console.log(`Current working directory: ${process.cwd()}`);
        console.log(`Database path: ${DB_PATH}`);
        console.log(`Server running on port ${PORT}`);
        console.log(`Try accessing: http://localhost:${PORT}/health`);
    });
}

module.exports = app;