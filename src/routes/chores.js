const express = require('express');
const router = express.Router();
const TaskService = require('../services/TaskService');
const CalendarService = require('../services/CalendarService');
const NotificationService = require('../services/NotificationService');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCreateTask, validateUpdateTask, validateCompleteTask } = require('../middleware/validation/taskValidator');

const taskService = new TaskService();
const calendarService = new CalendarService();
const notificationService = new NotificationService();

// Get all tasks (filtered by user if not admin/manager)
router.get('/', authenticate, async (req, res, next) => {
    try {
        const { startDate, endDate, userId } = req.query;
        
        let options = {
            startDate,
            endDate,
            includeInstances: true
        };

        if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
            options.userId = req.user.id;
        } else if (userId && userId !== 'null') {
            options.userId = parseInt(userId, 10);
        }

        const tasks = await taskService.getTasks(options);
        res.json(tasks || []);
    } catch (error) {
        next(error);
    }
});

// Get a specific task
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const task = await taskService.getTaskById(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (!['ADMIN', 'MANAGER'].includes(req.user.role) && 
            task.assigned_to !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        res.json(task);
    } catch (error) {
        next(error);
    }
});

// Create a new task
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), validateCreateTask, async (req, res, next) => {
    try {
        const newTask = await taskService.createTask(req.validatedData);
        
        // Generate instances if frequency is set
        if (newTask.frequency_id) {
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = req.validatedData.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            await calendarService.generateInstances(newTask.id, startDate, endDate);
        }

        // Create notification for assigned user
        await notificationService.createTaskNotification(newTask.id, 'assignment');
        
        res.status(201).json(newTask);
    } catch (error) {
        next(error);
    }
});

// Update a task instance's completion status
router.put('/:id/instances/:instanceId', authenticate, validateCompleteTask, async (req, res, next) => {
    try {
        const task = await taskService.getTaskById(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (!['ADMIN', 'MANAGER'].includes(req.user.role) && 
            task.assigned_to !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const updates = {
            ...req.validatedData,
            completed_at: req.validatedData.is_complete ? new Date().toISOString() : null,
            completed_by: req.validatedData.is_complete ? req.user.id : null
        };

        const updatedInstance = await taskService.updateInstance(req.params.instanceId, updates);
        if (!updatedInstance) {
            return res.status(404).json({ error: 'Task instance not found' });
        }

        // Create completion notification if task is completed
        if (updates.is_complete) {
            await notificationService.createTaskNotification(req.params.id, 'completion');
        }

        res.json(updatedInstance);
    } catch (error) {
        next(error);
    }
});

// Update a task
router.put('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), validateUpdateTask, async (req, res, next) => {
    try {
        const updatedTask = await taskService.updateTask(req.params.id, req.validatedData);
        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (req.validatedData.frequency_id) {
            // Regenerate future instances if frequency changed
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            await calendarService.generateInstances(updatedTask.id, startDate, endDate);
        }

        res.json(updatedTask);
    } catch (error) {
        next(error);
    }
});

// Delete a task
router.delete('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
        const success = await taskService.deleteTask(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

module.exports = router;