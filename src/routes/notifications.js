const express = require('express');
const router = express.Router();
const NotificationService = require('../services/NotificationService');
const { authenticate, authorize } = require('../middleware/auth');

const notificationService = new NotificationService();

// Get user notifications
router.get('/', authenticate, async (req, res, next) => {
    try {
        const notifications = await notificationService.getNotifications({
            userId: req.user.id,
            ...req.query
        });
        res.json(notifications);
    } catch (error) {
        next(error);
    }
});

// Create notification (admin/manager only)
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
        const newNotification = await notificationService.createNotification(req.body);
        res.status(201).json(newNotification);
    } catch (error) {
        next(error);
    }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res, next) => {
    try {
        const success = await notificationService.markAsRead(req.params.id, req.user.id);
        if (!success) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req, res, next) => {
    try {
        const count = await notificationService.markAllAsRead(req.user.id);
        res.json({ success: true, count });
    } catch (error) {
        next(error);
    }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        const success = await notificationService.deleteNotification(req.params.id, req.user.id);
        if (!success) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// Get user notification preferences
router.get('/preferences', authenticate, async (req, res, next) => {
    try {
        const preferences = await notificationService.getUserNotificationPreferences(req.user.id);
        if (!preferences) {
            return res.status(404).json({ error: 'Preferences not found' });
        }
        res.json(preferences);
    } catch (error) {
        next(error);
    }
});

// Process scheduled notifications (admin/manager only)
router.post('/process-scheduled', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
        const processed = await notificationService.processScheduledNotifications();
        res.json({
            success: true,
            processed: processed.length,
            notifications: processed
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;