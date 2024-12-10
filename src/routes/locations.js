const express = require('express');
const router = express.Router();
const LocationService = require('../services/LocationService');
const { authenticate, authorize } = require('../middleware/auth');

const locationService = new LocationService();

// Get all locations
router.get('/', authenticate, async (req, res, next) => {
    try {
        const locations = await locationService.getLocations(req.query);
        res.json(locations);
    } catch (error) {
        next(error);
    }
});

// Get location hierarchy
router.get('/hierarchy', authenticate, async (req, res, next) => {
    try {
        const hierarchy = await locationService.getLocationHierarchy();
        res.json(hierarchy);
    } catch (error) {
        next(error);
    }
});

// Get location by ID
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const location = await locationService.getLocationById(req.params.id);
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }
        res.json(location);
    } catch (error) {
        next(error);
    }
});

// Create new location (admin/manager only)
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
        const newLocation = await locationService.createLocation(req.body);
        res.status(201).json(newLocation);
    } catch (error) {
        next(error);
    }
});

// Update location (admin/manager only)
router.put('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
        const updatedLocation = await locationService.updateLocation(req.params.id, req.body);
        if (!updatedLocation) {
            return res.status(404).json({ error: 'Location not found' });
        }
        res.json(updatedLocation);
    } catch (error) {
        next(error);
    }
});

// Delete location (admin only)
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req, res, next) => {
    try {
        const success = await locationService.deleteLocation(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Location not found' });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// Get location supplies
router.get('/:id/supplies', authenticate, async (req, res, next) => {
    try {
        const supplies = await locationService.getLocationSupplies(req.params.id);
        res.json(supplies);
    } catch (error) {
        next(error);
    }
});

// Update location supplies (admin/manager only)
router.put('/:id/supplies', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
        const updatedSupplies = await locationService.updateLocationSupplies(req.params.id, req.body);
        res.json(updatedSupplies);
    } catch (error) {
        next(error);
    }
});

module.exports = router;