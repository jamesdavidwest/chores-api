const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const choreRoutes = require('./routes/chores');
const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/locations');
const userRoutes = require('./routes/users');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());

// Routes
app.use('/api/chores', choreRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/users', userRoutes);

// Error handling
app.use(errorHandler);

// Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;