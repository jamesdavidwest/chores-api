const express = require('express');
const router = express.Router();
const RealTimeMetricsService = require('../../services/RealTimeMetricsService');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validation');
const logger = require('../../services/LoggerService');

/**
 * @swagger
 * /api/metrics/snapshot:
 *   get:
 *     summary: Get current metrics snapshot
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current metrics snapshot
 */
router.get('/snapshot', auth(), async (req, res) => {
    try {
        const snapshot = RealTimeMetricsService.getMetricsSnapshot();
        res.json(snapshot);
    } catch (error) {
        logger.error('Error fetching metrics snapshot', {
            error: error.message,
            userId: req.user?.id
        });
        res.status(500).json({
            error: 'Failed to fetch metrics snapshot'
        });
    }
});

/**
 * @swagger
 * /api/metrics/events:
 *   get:
 *     summary: Get recent metric events
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: duration
 *         schema:
 *           type: integer
 *         description: Duration in milliseconds to fetch events for
 */
router.get('/events', auth(), validate({
    query: {
        duration: {
            type: 'number',
            optional: true,
            min: 0,
            max: 86400000 // 24 hours
        }
    }
}), async (req, res) => {
    try {
        const snapshot = RealTimeMetricsService.getMetricsSnapshot();
        const duration = req.query.duration || 3600000; // Default 1 hour
        const now = Date.now();

        const events = snapshot.events.filter(event => 
            (now - event.timestamp) <= duration
        );

        res.json(events);
    } catch (error) {
        logger.error('Error fetching metric events', {
            error: error.message,
            userId: req.user?.id,
            query: req.query
        });
        res.status(500).json({
            error: 'Failed to fetch metric events'
        });
    }
});

/**
 * @swagger
 * /api/metrics/config:
 *   get:
 *     summary: Get metrics collection configuration
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/config', auth(['admin']), async (req, res) => {
    try {
        const config = RealTimeMetricsService.getConfig();
        res.json(config);
    } catch (error) {
        logger.error('Error fetching metrics configuration', {
            error: error.message,
            userId: req.user?.id
        });
        res.status(500).json({
            error: 'Failed to fetch metrics configuration'
        });
    }
});

/**
 * @swagger
 * /api/metrics/config:
 *   put:
 *     summary: Update metrics collection configuration
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 */
router.put('/config', auth(['admin']), validate({
    body: {
        systemInterval: {
            type: 'number',
            optional: true,
            min: 1000,
            max: 60000
        },
        applicationInterval: {
            type: 'number',
            optional: true,
            min: 1000,
            max: 60000
        },
        databaseInterval: {
            type: 'number',
            optional: true,
            min: 1000,
            max: 60000
        },
        retentionPeriod: {
            type: 'number',
            optional: true,
            min: 3600000,
            max: 86400000
        },
        maxEventsStored: {
            type: 'number',
            optional: true,
            min: 100,
            max: 10000
        }
    }
}), async (req, res) => {
    try {
        RealTimeMetricsService.updateConfig(req.body);
        const updatedConfig = RealTimeMetricsService.getConfig();
        
        logger.info('Metrics configuration updated', {
            userId: req.user?.id,
            newConfig: req.body
        });

        res.json(updatedConfig);
    } catch (error) {
        logger.error('Error updating metrics configuration', {
            error: error.message,
            userId: req.user?.id,
            body: req.body
        });
        res.status(500).json({
            error: 'Failed to update metrics configuration'
        });
    }
});

/**
 * @swagger
 * /api/metrics/system:
 *   get:
 *     summary: Get system metrics
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/system', auth(), async (req, res) => {
    try {
        const snapshot = RealTimeMetricsService.getMetricsSnapshot();
        res.json(snapshot.system);
    } catch (error) {
        logger.error('Error fetching system metrics', {
            error: error.message,
            userId: req.user?.id
        });
        res.status(500).json({
            error: 'Failed to fetch system metrics'
        });
    }
});

/**
 * @swagger
 * /api/metrics/application:
 *   get:
 *     summary: Get application metrics
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/application', auth(), async (req, res) => {
    try {
        const snapshot = RealTimeMetricsService.getMetricsSnapshot();
        res.json(snapshot.application);
    } catch (error) {
        logger.error('Error fetching application metrics', {
            error: error.message,
            userId: req.user?.id
        });
        res.status(500).json({
            error: 'Failed to fetch application metrics'
        });
    }
});

/**
 * @swagger
 * /api/metrics/database:
 *   get:
 *     summary: Get database metrics
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/database', auth(), async (req, res) => {
    try {
        const snapshot = RealTimeMetricsService.getMetricsSnapshot();
        res.json(snapshot.database);
    } catch (error) {
        logger.error('Error fetching database metrics', {
            error: error.message,
            userId: req.user?.id
        });
        res.status(500).json({
            error: 'Failed to fetch database metrics'
        });
    }
});

module.exports = router;