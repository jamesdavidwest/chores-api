// src/routes/index.js
const express = require("express");
const router = express.Router();

// Import route modules
const eventRoutes = require("./api/events.routes");
const userRoutes = require("./api/users.routes");
const instanceRoutes = require("./api/instances.routes");
const alertRoutes = require("./api/alerts.routes"); // Add this line

// Import middleware
const authMiddleware = require("../middleware/auth");
const errorHandler = require("../middleware/errorHandler");

// API versioning function
const createVersionedRouter = (version) => {
  const versionedRouter = express.Router();

  // Add version-specific middleware here if needed
  versionedRouter.use((req, res, next) => {
    req.apiVersion = version;
    next();
  });

  // Mount routes
  versionedRouter.use("/events", authMiddleware, eventRoutes);
  versionedRouter.use("/users", userRoutes); // Some user routes may not require auth
  versionedRouter.use("/instances", authMiddleware, instanceRoutes);
  versionedRouter.use("/alerts", authMiddleware, alertRoutes); // Add this line

  return versionedRouter;
};

// Mount versioned routes
router.use("/v1", createVersionedRouter("v1"));

// Error handling - should be last
router.use(errorHandler);

module.exports = router;
