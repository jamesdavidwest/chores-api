const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
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
    const newChore = await createChore(req.body);
    res.status(201).json(newChore);
  } catch (error) {
    next(error);
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
    next(error);
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