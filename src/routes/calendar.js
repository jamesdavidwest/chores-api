const express = require('express');
const router = express.Router();
const CalendarService = require('../services/CalendarService');
const NotificationService = require('../services/NotificationService');
const { authenticate } = require('../middleware/auth');

const calendarService = new CalendarService();
const notificationService = new NotificationService();

// Get calendar events
router.get('/events', authenticate, async (req, res, next) => {
    try {
        const { startDate, endDate, userId, categoryId, locationId, status } = req.query;
        
        let options = {
            startDate,
            endDate,
            categoryId,
            locationId,
            status
        };

        // Non-admin users can only see their own events
        if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
            options.userId = req.user.id;
        } else if (userId) {
            options.userId = userId;
        }

        const events = await calendarService.getCalendarEvents(options);
        res.json(events);
    } catch (error) {
        next(error);
    }
});

// Get daily schedule
router.get('/daily/:date', authenticate, async (req, res, next) => {
    try {
        const userId = !['ADMIN', 'MANAGER'].includes(req.user.role) ? req.user.id : req.query.userId;
        const schedule = await calendarService.getDailySchedule(req.params.date, userId);
        res.json(schedule);
    } catch (error) {
        next(error);
    }
});

// Get weekly schedule
router.get('/weekly/:startDate', authenticate, async (req, res, next) => {
    try {
        const userId = !['ADMIN', 'MANAGER'].includes(req.user.role) ? req.user.id : req.query.userId;
        const schedule = await calendarService.getWeeklySchedule(req.params.startDate, userId);
        res.json(schedule);
    } catch (error) {
        next(error);
    }
});

// Get upcoming tasks
router.get('/upcoming', authenticate, async (req, res, next) => {
    try {
        const days = req.query.days ? parseInt(req.query.days, 10) : 7;
        const userId = !['ADMIN', 'MANAGER'].includes(req.user.role) ? req.user.id : req.query.userId;
        const tasks = await calendarService.getUpcomingTasks(userId, days);
        res.json(tasks);
    } catch (error) {
        next(error);
    }
});

// Move task instance to new date/time
router.put('/events/:instanceId/move', authenticate, async (req, res, next) => {
    try {
        const { date, time } = req.body;
        
        // Check for conflicts
        const conflicts = await calendarService.getTaskConflicts(date, time, req.user.id);
        if (conflicts && conflicts.length > 0) {
            return res.status(409).json({
                error: 'Time slot conflict',
                conflicts
            });
        }

        const updatedInstance = await calendarService.moveInstance(req.params.instanceId, date, time);
        if (!updatedInstance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        // Create notification for rescheduled task
        await notificationService.createTaskNotification(updatedInstance.task_id, 'reschedule');

        res.json(updatedInstance);
    } catch (error) {
        next(error);
    }
});

// Generate instances for date range
router.post('/generate-instances', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
        const { taskId, startDate, endDate } = req.body;
        
        if (!taskId || !startDate || !endDate) {
            return res.status(400).json({ error: 'taskId, startDate, and endDate are required' });
        }

        const instances = await calendarService.generateInstances(taskId, startDate, endDate);
        res.json(instances);
    } catch (error) {
        next(error);
    }
});

module.exports = router;