const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { DEFAULT_DUE_TIME } = require('../utils/dateValidation');
const {
  getChores,
  getChoreById,
  createChore,
  updateChore,
  deleteChore,
  getChoreInstances,
  updateChoreInstance
} = require('../utils/dataAccess');

// Get all chores (filtered by user if not admin/manager)
router.get('/', authenticate, async (req, res, next) => {
  try {
    console.log('GET /chores - User:', req.user);
    console.log('GET /chores - Query:', req.query);
    
    const { startDate, endDate, userId } = req.query;
    
    const allChores = await getChores({ 
      includeInstances: true,
      startDate,
      endDate,
      userId: userId === 'null' ? null : userId
    });
    console.log('GET /chores - All chores:', allChores);

    if (!allChores) {
      return res.json([]);
    }

    let chores;
    if (['ADMIN', 'MANAGER'].includes(req.user.role)) {
      // If userId is provided in query and user is admin/manager, filter by that
      if (userId && userId !== 'null') {
        const filterUserId = parseInt(userId, 10);
        chores = allChores.filter(chore => chore.assigned_to === filterUserId);
      } else {
        chores = allChores;
      }
    } else {
      // Regular users can only see their own chores
      chores = allChores.filter(chore => chore.assigned_to === req.user.id);
    }

    console.log('GET /chores - Filtered chores:', chores);
    res.json(chores || []);
  } catch (error) {
    console.error('GET /chores - Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get a specific chore
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const chore = await getChoreById(req.params.id);
    if (!chore) {
      return res.status(404).json({ error: 'Chore not found' });
    }

    if (!['ADMIN', 'MANAGER'].includes(req.user.role) && 
        chore.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get instances for this chore
    const instances = await getChoreInstances({ choreId: chore.id });
    const responseChore = {
      ...chore,
      instances
    };

    res.json(responseChore);
  } catch (error) {
    next(error);
  }
});

// Create a new chore
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    console.log('POST /chores - Request body:', JSON.stringify(req.body, null, 2));

    const choreData = {
      ...req.body,
      due_time: req.body.due_time || DEFAULT_DUE_TIME
    };

    console.log('POST /chores - Processed choreData:', JSON.stringify(choreData, null, 2));

    const newChore = await createChore(choreData);
    console.log('POST /chores - Created chore:', JSON.stringify(newChore, null, 2));
    
    // Get instances that were created
    const instances = await getChoreInstances({ choreId: newChore.id });
    const responseChore = {
      ...newChore,
      instances
    };
    
    res.status(201).json(responseChore);
  } catch (error) {
    next(error);
  }
});

// Update a chore instance's completion status
router.put('/:id/instances/:instanceId', authenticate, async (req, res, next) => {
  try {
    const chore = await getChoreById(req.params.id);
    if (!chore) {
      return res.status(404).json({ error: 'Chore not found' });
    }

    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      if (chore.assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const { is_complete } = req.body;
    const updates = {
      is_complete,
      completed_at: is_complete ? new Date().toISOString() : null,
      completed_by: is_complete ? req.user.id : null
    };

    const updatedInstance = await updateChoreInstance(req.params.instanceId, updates);
    if (!updatedInstance) {
      return res.status(404).json({ error: 'Chore instance not found' });
    }

    res.json(updatedInstance);
  } catch (error) {
    next(error);
  }
});

// Update a chore
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const chore = await getChoreById(req.params.id);
    if (!chore) {
      return res.status(404).json({ error: 'Chore not found' });
    }

    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden - Only admins and managers can update chores' });
    }

    const updatedChore = await updateChore(req.params.id, req.body);
    
    // Get updated instances
    const instances = await getChoreInstances({ choreId: updatedChore.id });
    const responseChore = {
      ...updatedChore,
      instances
    };

    res.json(responseChore);
  } catch (error) {
    next(error);
  }
});

// Delete a chore
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
