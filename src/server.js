require("dotenv").config();
const app = require("./app");
const LoggerService = require("./services/LoggerService");

const PORT = process.env.PORT || 3000;
const logger = LoggerService.getInstance();

// Start server
app.listen(PORT, () => {
  logger.info("Server started", {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
  });
});
