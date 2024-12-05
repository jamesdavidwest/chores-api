const express = require('express');
const router = express.Router();
const calendarService = require('../services/calendarService');

// Get chores for calendar view
router.get('/events', async (req, res) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) {
            return res.status(400).json({ 
                error: 'Start and end dates are required' 
            });
        }

        const events = await calendarService.getChoresForCalendar(start, end);
        res.json(events);
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ 
            error: 'Internal server error fetching calendar events' 
        });
    }
});

// Mark chore as completed
router.post('/complete/:id', async (req, res) => {
    try {
        const choreId = parseInt(req.params.id);
        const userId = req.body.userId; // Assuming you're passing the user ID in the request body

        if (!choreId || !userId) {
            return res.status(400).json({
                error: 'Chore ID and User ID are required'
            });
        }

        await calendarService.markChoreCompleted(choreId, userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking chore as completed:', error);
        res.status(500).json({
            error: 'Internal server error marking chore as completed'
        });
    }
});

// Update chore schedule
router.patch('/reschedule/:id', async (req, res) => {
    try {
        const choreId = parseInt(req.params.id);
        const { date, time } = req.body;

        if (!choreId || !date) {
            return res.status(400).json({
                error: 'Chore ID and new date are required'
            });
        }

        await calendarService.updateChoreSchedule(choreId, date, time);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating chore schedule:', error);
        res.status(500).json({
            error: 'Internal server error updating chore schedule'
        });
    }
});

module.exports = router;