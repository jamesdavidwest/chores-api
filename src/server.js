const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const choreRoutes = require('./routes/chores');
const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/locations');
const userRoutes = require('./routes/users');
const calendarRoutes = require('./routes/calendar');
const { errorHandler } = require('./middleware/errorHandler');

// Verify database exists
const DB_PATH = path.join(__dirname, '../data/database.json');
if (!fs.existsSync(DB_PATH)) {
    console.error('Database file not found:', DB_PATH);
    process.exit(1);
}

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
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: fs.existsSync(DB_PATH) ? 'accessible' : 'not found'
    });
});

// Routes
app.use('/api/chores', choreRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calendar', calendarRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error('Global error handler:', {
        url: req.url,
        method: req.method,
        error: err.message,
        stack: err.stack
    });
    next(err);
});

app.use(errorHandler);

// Server
let server;
if (process.env.NODE_ENV !== 'test') {
    server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server starting...`);
        console.log(`Current working directory: ${process.cwd()}`);
        console.log(`Database path: ${DB_PATH}`);
        console.log(`Server running on port ${PORT}`);
        console.log(`Try accessing: http://localhost:${PORT}/health`);
    });

    // Handle server errors
    server.on('error', (error) => {
        console.error('Server error:', error);
        process.exit(1);
    });
}

module.exports = { app, server };