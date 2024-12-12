// src/schemas/instance.schema.js
const Joi = require('joi');

const instanceSchemas = {
  createInstance: Joi.object({
    name: Joi.string().required().min(1).max(255),
    description: Joi.string().optional().max(1000),
    type: Joi.string().required(),
    status: Joi.string().valid('active', 'inactive', 'archived').default('active'),
    settings: Joi.object().optional(),
    metadata: Joi.object().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    parentId: Joi.string().optional(), // For hierarchical instances
    tags: Joi.array().items(Joi.string()).optional(),
  }),

  updateInstance: Joi.object({
    name: Joi.string().min(1).max(255),
    description: Joi.string().max(1000),
    type: Joi.string(),
    status: Joi.string().valid('active', 'inactive', 'archived'),
    settings: Joi.object(),
    metadata: Joi.object(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    parentId: Joi.string(),
    tags: Joi.array().items(Joi.string()),
  }).min(1), // Require at least one field to be updated
};

module.exports = instanceSchemas;
