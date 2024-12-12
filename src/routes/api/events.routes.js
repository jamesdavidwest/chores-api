// src/routes/api/events.routes.js
const express = require('express');
const router = express.Router();
const { validateSchema } = require('../../middleware/validation/schemaValidator');
const eventSchemas = require('../../schemas/event.schema');
const EventController = require('../../controllers/event.controller');

// Initialize controller
const eventController = new EventController();

// GET /api/v1/events
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    const events = await eventController.list(parseInt(page), parseInt(limit), filters);
    res.json({
      success: true,
      data: events.data,
      metadata: {
        pagination: events.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/events/:id
router.get('/:id', async (req, res, next) => {
  try {
    const event = await eventController.getById(req.params.id);
    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/events
router.post('/', validateSchema(eventSchemas.createEvent), async (req, res, next) => {
  try {
    const event = await eventController.create(req.body);
    res.status(201).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/events/:id
router.put('/:id', validateSchema(eventSchemas.updateEvent), async (req, res, next) => {
  try {
    const event = await eventController.update(req.params.id, req.body);
    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/events/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await eventController.delete(req.params.id);
    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
