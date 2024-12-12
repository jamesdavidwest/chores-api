// src/routes/api/instances.routes.js

const express = require("express");
const router = express.Router();
const {
  validateSchema,
} = require("../../middleware/validation/schemaValidator");
const instanceSchemas = require("../../schemas/instance.schema");
const InstanceController = require("../../controllers/instance.controller");

// Initialize controller
const instanceController = new InstanceController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Instance:
 *       type: object
 *       required:
 *         - name
 *         - type
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Instance unique identifier
 *         name:
 *           type: string
 *           maxLength: 255
 *           description: Instance name
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: Detailed description of the instance
 *         type:
 *           type: string
 *           description: Type of instance
 *         status:
 *           type: string
 *           enum: [active, inactive, archived]
 *           default: active
 *           description: Current status of the instance
 *         settings:
 *           type: object
 *           description: Instance-specific settings
 *         metadata:
 *           type: object
 *           description: Additional instance metadata
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Start date of the instance
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: End date of the instance
 *         parentId:
 *           type: string
 *           format: uuid
 *           description: ID of parent instance for hierarchical relationships
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of tags associated with the instance
 *         createdBy:
 *           type: string
 *           format: uuid
 *           description: ID of user who created the instance
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         archivedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the instance was archived, if applicable
 *
 *     InstanceResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/Instance'
 *
 *     InstanceListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Instance'
 *         metadata:
 *           type: object
 *           properties:
 *             pagination:
 *               $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * tags:
 *   name: Instances
 *   description: Instance management endpoints
 */

/**
 * @swagger
 * /api/v1/instances:
 *   get:
 *     summary: List instances with pagination and filters
 *     tags: [Instances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by instance type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, archived]
 *         description: Filter by instance status
 *       - in: query
 *         name: tags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: false
 *         description: Filter by tags (comma-separated)
 *     responses:
 *       200:
 *         description: List of instances retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InstanceListResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    const instances = await instanceController.list(
      parseInt(page),
      parseInt(limit),
      filters
    );
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

/**
 * @swagger
 * /api/v1/instances/{id}:
 *   get:
 *     summary: Get instance by ID
 *     tags: [Instances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Instance ID
 *     responses:
 *       200:
 *         description: Instance details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InstanceResponse'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get("/:id", async (req, res, next) => {
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

/**
 * @swagger
 * /api/v1/instances:
 *   post:
 *     summary: Create a new instance
 *     tags: [Instances]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *               settings:
 *                 type: object
 *               metadata:
 *                 type: object
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               parentId:
 *                 type: string
 *                 format: uuid
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Instance created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InstanceResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         description: Parent instance not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/",
  validateSchema(instanceSchemas.createInstance),
  async (req, res, next) => {
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
  }
);

/**
 * @swagger
 * /api/v1/instances/{id}:
 *   put:
 *     summary: Update an instance
 *     tags: [Instances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Instance ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               settings:
 *                 type: object
 *               metadata:
 *                 type: object
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               parentId:
 *                 type: string
 *                 format: uuid
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Instance updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InstanceResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put(
  "/:id",
  validateSchema(instanceSchemas.updateInstance),
  async (req, res, next) => {
    try {
      const instance = await instanceController.update(
        req.params.id,
        req.body,
        req.user.id
      );
      res.json({
        success: true,
        data: instance,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/instances/{id}:
 *   delete:
 *     summary: Delete an instance
 *     tags: [Instances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Instance ID
 *     responses:
 *       200:
 *         description: Instance deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: null
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete("/:id", async (req, res, next) => {
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

/**
 * @swagger
 * /api/v1/instances/{id}/archive:
 *   post:
 *     summary: Archive an instance
 *     tags: [Instances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Instance ID
 *     responses:
 *       200:
 *         description: Instance archived successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InstanceResponse'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post("/:id/archive", async (req, res, next) => {
  try {
    const instance = await instanceController.archive(
      req.params.id,
      req.user.id
    );
    res.json({
      success: true,
      data: instance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/instances/{id}/restore:
 *   post:
 *     summary: Restore an archived instance
 *     tags: [Instances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Instance ID
 *     responses:
 *       200:
 *         description: Instance restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InstanceResponse'
 *       400:
 *         description: Instance is not archived
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post("/:id/restore", async (req, res, next) => {
  try {
    const instance = await instanceController.restore(
      req.params.id,
      req.user.id
    );
    res.json({
      success: true,
      data: instance,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
