// src/schemas/event.schema.js
const Joi = require('joi');

const eventSchemas = {
  createEvent: Joi.object({
    title: Joi.string().required().min(1).max(255),
    description: Joi.string().optional().max(1000),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    type: Joi.string().required().valid('one-time', 'recurring'),
    status: Joi.string()
      .valid('scheduled', 'in-progress', 'completed', 'cancelled')
      .default('scheduled'),
    metadata: Joi.object().optional(),
    userId: Joi.string().required(), // Reference to the user who created the event
    instanceId: Joi.string().optional(), // Optional reference to an instance
  }),

  updateEvent: Joi.object({
    title: Joi.string().min(1).max(255),
    description: Joi.string().max(1000),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    type: Joi.string().valid('one-time', 'recurring'),
    status: Joi.string().valid('scheduled', 'in-progress', 'completed', 'cancelled'),
    metadata: Joi.object(),
    instanceId: Joi.string(),
  }).min(1), // Require at least one field to be updated
};

module.exports = eventSchemas;
