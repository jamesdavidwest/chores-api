// src/routes/api/events.routes.js

const express = require("express");
const router = express.Router();
const {
  validateSchema,
} = require("../../middleware/validation/schemaValidator");
const eventSchemas = require("../../schemas/event.schema");
const EventController = require("../../controllers/event.controller");

// Initialize controller
const eventController = new EventController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       required:
 *         - title
 *         - startDate
 *         - type
 *         - userId
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated event ID
 *         title:
 *           type: string
 *           maxLength: 255
 *           description: Event title
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: Detailed description of the event
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Event start date and time
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: Event end date and time
 *         type:
 *           type: string
 *           enum: [one-time, recurring]
 *           description: Type of event
 *         status:
 *           type: string
 *           enum: [scheduled, in-progress, completed, cancelled]
 *           default: scheduled
 *           description: Current status of the event
 *         metadata:
 *           type: object
 *           description: Additional event data
 *         userId:
 *           type: string
 *           description: ID of the user who created the event
 *         instanceId:
 *           type: string
 *           description: Associated instance ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     EventResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/Event'
 *     EventListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Event'
 *         metadata:
 *           type: object
 *           properties:
 *             pagination:
 *               $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management endpoints
 */

/**
 * @swagger
 * /api/v1/events:
 *   get:
 *     summary: List events with pagination and filters
 *     tags: [Events]
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
 *           enum: [one-time, recurring]
 *         description: Filter by event type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in-progress, completed, cancelled]
 *         description: Filter by event status
 *     responses:
 *       200:
 *         description: List of events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventListResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    const events = await eventController.list(
      parseInt(page),
      parseInt(limit),
      filters
    );
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

/**
 * @swagger
 * /api/v1/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", async (req, res, next) => {
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

/**
 * @swagger
 * /api/v1/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - startDate
 *               - type
 *               - userId
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               type:
 *                 type: string
 *                 enum: [one-time, recurring]
 *               status:
 *                 type: string
 *                 enum: [scheduled, in-progress, completed, cancelled]
 *                 default: scheduled
 *               metadata:
 *                 type: object
 *               userId:
 *                 type: string
 *               instanceId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/",
  validateSchema(eventSchemas.createEvent),
  async (req, res, next) => {
    try {
      const event = await eventController.create(req.body);
      res.status(201).json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/events/{id}:
 *   put:
 *     summary: Update an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               type:
 *                 type: string
 *                 enum: [one-time, recurring]
 *               status:
 *                 type: string
 *                 enum: [scheduled, in-progress, completed, cancelled]
 *               metadata:
 *                 type: object
 *               instanceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/:id",
  validateSchema(eventSchemas.updateEvent),
  async (req, res, next) => {
    try {
      const event = await eventController.update(req.params.id, req.body);
      res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
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
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", async (req, res, next) => {
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
