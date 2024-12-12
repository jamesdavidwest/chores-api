// src/app.js

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { config } = require("./config/auth");
const { apiLimiter, authLimiter } = require("./middleware/rateLimiter");
const requestLogger = require("./middleware/requestLogger");
const responseHandler = require("./middleware/responseHandler");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./services/LoggerService");

// Import routes
const authRoutes = require("./routes/auth.routes");

// Create Express app
const app = express();

// Logging middleware - should be first to capture all requests
app.use(requestLogger);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

// Request parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Response handler - after parsing, before routes
app.use(responseHandler);

// Apply rate limiting
app.use("/api/", apiLimiter); // General API rate limiting
app.use("/api/v1/auth", authLimiter); // Stricter limiting for auth routes

// API versioning and routes
app.use("/api/v1/auth", authRoutes);

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.success({ status: "ok", timestamp: new Date().toISOString() });
});

// Log uncaught API routes before 404
app.use((req, res, next) => {
  logger.warn("Route not found", {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  });
  next();
});

// 404 handler
app.use((req, res) => {
  res.status(404).error({
    code: "NOT_FOUND",
    message: "Resource not found",
  });
});

// Global error handler - must be last
app.use(errorHandler);

// Log application startup
app.on("ready", () => {
  logger.info("Application started", {
    env: process.env.NODE_ENV,
    port: process.env.PORT,
  });
});

module.exports = app;