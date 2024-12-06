const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { DEFAULT_DUE_TIME } = require('../utils/dateValidation');
const {
  getChores,
  getChoreById,
  createChore,
  updateChore,
  deleteChore
} = require('../utils/dataAccess');

// Get all chores (filtered by user if not admin/manager)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const allChores = await getChores();
    if (['ADMIN', 'MANAGER'].includes(req.user.role)) {
      res.json(allChores);
    } else {
      const userChores = allChores.filter(chore => chore.assigned_to === req.user.id);
      res.json(userChores);
    }
  } catch (error) {
    next(error);
  }
});

// Get single chore
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const chore = await getChoreById(req.params.id);
    if (!chore) {
      return res.status(404).json({ error: 'Chore not found' });
    }
    
    // Check if user has access to this chore
    if (!['ADMIN', 'MANAGER'].includes(req.user.role) && 
        chore.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    res.json(chore);
  } catch (error) {
    next(error);
  }
});

// Create new chore (admin/manager only)
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const { due_date, due_time = DEFAULT_DUE_TIME, ...choreData } = req.body;

    // If no due_date provided, default to today at DEFAULT_DUE_TIME
    if (!due_date) {
      const today = new Date();
      choreData.due_date = today.toISOString().split('T')[0];
      choreData.due_time = DEFAULT_DUE_TIME;
    } else {
      choreData.due_date = due_date;
      choreData.due_time = due_time;
    }

    const newChore = await createChore(choreData);
    res.status(201).json(newChore);
  } catch (error) {
    if (error.message.includes('due date')) {
      res.status(400).json({ error: error.message });
    } else {
      next(error);
    }
  }
});

// Update chore
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const chore = await getChoreById(req.params.id);
    if (!chore) {
      return res.status(404).json({ error: 'Chore not found' });
    }

    // Only allow admin/manager to update all fields
    // Regular users can only toggle completion
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      if (chore.assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      // Only allow updating is_complete and last_completed
      const { is_complete } = req.body;
      const updatedChore = await updateChore(req.params.id, { 
        is_complete,
        last_completed: is_complete ? new Date().toISOString() : null
      });
      return res.json(updatedChore);
    }

    const updatedChore = await updateChore(req.params.id, req.body);
    res.json(updatedChore);
  } catch (error) {
    if (error.message.includes('due date')) {
      res.status(400).json({ error: error.message });
    } else {
      next(error);
    }
  }
});

// Delete chore (admin/manager only)
router.delete('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const success = await deleteChore(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Chore not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;