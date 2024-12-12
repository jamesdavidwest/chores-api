const { v4: uuidv4 } = require("uuid");
const logger = require("../services/LoggerService");

const requestLogger = (req, res, next) => {
  // Add request ID
  req.id = uuidv4();

  // Record start time
  const start = Date.now();

  // Log on response finish
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });

  next();
};

module.exports = requestLogger;
