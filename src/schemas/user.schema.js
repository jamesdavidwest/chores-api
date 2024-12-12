// src/schemas/user.schema.js
const Joi = require("joi");

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const userSchemas = {
  registerUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().pattern(passwordRegex).required().messages({
      "string.pattern.base":
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character",
    }),
    firstName: Joi.string().required().min(2).max(50),
    lastName: Joi.string().required().min(2).max(50),
    role: Joi.string().valid("user", "admin").default("user"),
    metadata: Joi.object().optional(),
  }),

  loginUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateUser: Joi.object({
    email: Joi.string().email(),
    password: Joi.string().pattern(passwordRegex).messages({
      "string.pattern.base":
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character",
    }),
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    metadata: Joi.object(),
  }).min(1), // Require at least one field to be updated

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().pattern(passwordRegex).required().messages({
      "string.pattern.base":
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character",
    }),
  }),

  resendVerification: Joi.object({
    email: Joi.string().email().required(),
  }),
};

module.exports = userSchemas;
