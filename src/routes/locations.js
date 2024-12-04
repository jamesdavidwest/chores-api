const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getLocations, getLocationById } = require('../utils/dataAccess');

// Get all locations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const locations = await getLocations();
    res.json(locations);
  } catch (error) {
    next(error);
  }
});

// Get single location
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const location = await getLocationById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    next(error);
  }
});

module.exports = router;