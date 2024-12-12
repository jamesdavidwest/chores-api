// src/routes/api/instances.routes.js
const express = require('express');
const router = express.Router();
const { validateSchema } = require('../../middleware/validation/schemaValidator');
const instanceSchemas = require('../../schemas/instance.schema');
const InstanceController = require('../../controllers/instance.controller');

// Initialize controller
const instanceController = new InstanceController();

// GET /api/v1/instances
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    const instances = await instanceController.list(parseInt(page), parseInt(limit), filters);
    res.json({
      success: true,
      data: instances.data,
      metadata: {
        pagination: instances.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/instances/:id
router.get('/:id', async (req, res, next) => {
  try {
    const instance = await instanceController.getById(req.params.id);
    res.json({
      success: true,
      data: instance,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/instances
router.post('/', validateSchema(instanceSchemas.createInstance), async (req, res, next) => {
  try {
    const instance = await instanceController.create({
      ...req.body,
      createdBy: req.user.id,
    });
    res.status(201).json({
      success: true,
      data: instance,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/instances/:id
router.put('/:id', validateSchema(instanceSchemas.updateInstance), async (req, res, next) => {
  try {
    const instance = await instanceController.update(req.params.id, req.body, req.user.id);
    res.json({
      success: true,
      data: instance,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/instances/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await instanceController.delete(req.params.id, req.user.id);
    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/instances/:id/archive
router.post('/:id/archive', async (req, res, next) => {
  try {
    const instance = await instanceController.archive(req.params.id, req.user.id);
    res.json({
      success: true,
      data: instance,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/instances/:id/restore
router.post('/:id/restore', async (req, res, next) => {
  try {
    const instance = await instanceController.restore(req.params.id, req.user.id);
    res.json({
      success: true,
      data: instance,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
