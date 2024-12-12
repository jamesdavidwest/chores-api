// src/middleware/swagger.js

const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const swaggerOptions = require("../config/swagger");
const { LoggerService } = require("../services/LoggerService");

const logger = LoggerService.getInstance();

/**
 * Configure Swagger documentation middleware
 * @param {import('express').Application} app - Express application instance
 */
const setupSwagger = (app) => {
  try {
    // Generate Swagger specification
    const swaggerSpec = swaggerJsdoc(swaggerOptions);

    // Swagger documentation endpoint
    app.use("/api-docs", swaggerUi.serve);

    // Setup Swagger UI endpoint with custom options
    app.get(
      "/api-docs",
      swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customSiteTitle: "Backend Boilerplate API Documentation",
        customCss: ".swagger-ui .topbar { display: none }",
        swaggerOptions: {
          persistAuthorization: true,
          filter: true,
          displayRequestDuration: true,
        },
      })
    );

    // Expose swagger.json endpoint
    app.get("/swagger.json", (req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.send(swaggerSpec);
    });

    logger.info("Swagger documentation initialized", {
      context: {
        service: "SwaggerSetup",
        endpoints: ["/api-docs", "/swagger.json"],
      },
    });
  } catch (error) {
    logger.error("Failed to initialize Swagger documentation", {
      context: {
        service: "SwaggerSetup",
        error: error.message,
      },
    });
    throw error;
  }
};

module.exports = setupSwagger;
