// src/app.js

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { apiLimiter, authLimiter } = require("./middleware/rateLimiter");
const requestLogger = require("./middleware/requestLogger");
const responseHandler = require("./middleware/responseHandler");
const errorHandler = require("./middleware/errorHandler");
const performanceMonitor = require("./middleware/performanceMonitor");
const setupSwagger = require("./middleware/swagger");
const logger = require("./services/LoggerService");
const PerformanceReportService = require("./services/PerformanceReportService");

// Import routes
const authRoutes = require("./routes/auth.routes");
const performanceRoutes = require("./routes/api/performance.routes");

// Create Express app
const app = express();

// Logging middleware - should be first to capture all requests
app.use(requestLogger);

// Performance monitoring - early in the middleware chain to capture accurate metrics
app.use(performanceMonitor());

// Security middleware
app.use(
  helmet({
    // Modify CSP for Swagger UI
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "img-src": ["'self'", "data:", "https:"],
      },
    },
  })
);
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

// Setup Swagger documentation
if (
  process.env.NODE_ENV !== "production" ||
  process.env.SWAGGER_ENABLED === "true"
) {
  setupSwagger(app);
}

// Apply rate limiting
app.use("/api/", apiLimiter); // General API rate limiting
app.use("/api/v1/auth", authLimiter); // Stricter limiting for auth routes

// API versioning and routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/performance", performanceRoutes);

// Basic health check endpoint with performance metrics
app.get("/health", (req, res) => {
  const MetricsCollector = require('../tests/benchmarks/collectors/MetricsCollector');
  const metrics = MetricsCollector.getStatus();
  
  res.success({
    status: "ok",
    timestamp: new Date().toISOString(),
    performance: {
      metrics_collection: metrics.isCollecting ? 'active' : 'inactive',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      reporting: {
        automated: PerformanceReportService.getConfig().isReportingActive,
        interval: PerformanceReportService.getConfig().interval,
      }
    }
  });
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

// Enhanced application startup with performance monitoring
app.on("ready", () => {
  const MetricsCollector = require('../tests/benchmarks/collectors/MetricsCollector');
  
  // Start automated performance reporting if enabled
  if (process.env.ENABLE_AUTOMATED_PERFORMANCE_REPORTS === 'true') {
    PerformanceReportService.startAutomatedReporting();
  }
  
  logger.info("Application started", {
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    performance_monitoring: {
      enabled: true,
      metrics_collection: MetricsCollector.getStatus().isCollecting ? 'active' : 'inactive',
      automated_reporting: PerformanceReportService.getConfig().isReportingActive
    }
  });
});

module.exports = app;