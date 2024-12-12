// src/routes/items.js
const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const auth = require('../middleware/auth');
const ItemService = require('../services/ItemService');
const validate = require('../middleware/validation/validator');

// Create item
router.post('/', 
  auth,
  [
    body('title').trim().notEmpty(),
    body('description').optional().trim(),
    body('status').optional().isIn(['active', 'completed', 'archived']),
    body('dueDate').optional().isISO8601(),
    body('categoryId').optional().isNumeric(),
    body('locationId').optional().isNumeric(),
    body('assignedTo').optional().isArray(),
    body('metadata').optional().isObject()
  ],
  validate,
  async (req, res, next) => {
    try {
      const item = await ItemService.createItem({
        ...req.body,
        createdBy: req.user.id
      });
      res.status(201).json({
        success: true,
        data: item
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get items with filtering
router.get('/',
  auth,
  [
    query('status').optional().isIn(['active', 'completed', 'archived']),
    query('categoryId').optional().isNumeric(),
    query('locationId').optional().isNumeric(),
    query('assignedTo').optional().isNumeric(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  async (req, res, next) => {
    try {
      const items = await ItemService.getItems(req.query);
      res.json({
        success: true,
        data: items.data,
        metadata: items.metadata
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get single item
router.get('/:id',
  auth,
  async (req, res, next) => {
    try {
      const item = await ItemService.getItemById(req.params.id);
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update item
router.patch('/:id',
  auth,
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('status').optional().isIn(['active', 'completed', 'archived']),
    body('dueDate').optional().isISO8601(),
    body('categoryId').optional().isNumeric(),
    body('locationId').optional().isNumeric(),
    body('assignedTo').optional().isArray(),
    body('metadata').optional().isObject()
  ],
  validate,
  async (req, res, next) => {
    try {
      const item = await ItemService.updateItem(req.params.id, req.body);
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete item
router.delete('/:id',
  auth,
  async (req, res, next) => {
    try {
      await ItemService.deleteItem(req.params.id);
      res.json({
        success: true,
        data: null
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;