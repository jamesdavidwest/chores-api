const express = require("express");
const router = express.Router();
const AlertNotificationService = require("../services/AlertNotificationService");

/**
 * @swagger
 * /api/alerts/stats:
 *   get:
 *     summary: Get alert statistics
 *     description: Retrieve alert statistics including counts by severity and state
 *     responses:
 *       200:
 *         description: Alert statistics retrieved successfully
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = AlertNotificationService.getStatus();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/alerts/active:
 *   get:
 *     summary: Get active alerts
 *     description: Retrieve all active alerts
 *     responses:
 *       200:
 *         description: Active alerts retrieved successfully
 */
router.get("/active", async (req, res) => {
  try {
    const activeAlerts = AlertNotificationService.getActiveAlerts();
    res.json(activeAlerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/alerts/history:
 *   get:
 *     summary: Get alert history
 *     description: Retrieve alert history with optional filters
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *         description: Filter by alert severity
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by alert state
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *         description: Start time for historical data
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *         description: End time for historical data
 *     responses:
 *       200:
 *         description: Alert history retrieved successfully
 */
router.get("/history", async (req, res) => {
  try {
    const { severity, state, startTime, endTime } = req.query;
    const filters = {
      ...(severity && { severity }),
      ...(state && { state }),
      ...(startTime && { startTime: new Date(startTime).getTime() }),
      ...(endTime && { endTime: new Date(endTime).getTime() }),
    };
    const history = AlertNotificationService.getAlertHistory(filters);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/alerts/{alertId}/acknowledge:
 *   post:
 *     summary: Acknowledge an alert
 *     description: Acknowledge an active alert
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the alert to acknowledge
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               acknowledgedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Alert acknowledged successfully
 */
router.post("/:alertId/acknowledge", async (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;
    AlertNotificationService.acknowledgeAlert(alertId, acknowledgedBy);
    res.json({ message: "Alert acknowledged successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/alerts/{alertId}/resolve:
 *   post:
 *     summary: Resolve an alert
 *     description: Resolve an active or acknowledged alert
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the alert to resolve
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolvedBy:
 *                 type: string
 *               resolution:
 *                 type: string
 *     responses:
 *       200:
 *         description: Alert resolved successfully
 */
router.post("/:alertId/resolve", async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolvedBy, resolution } = req.body;
    AlertNotificationService.resolveAlert(alertId, resolvedBy, resolution);
    res.json({ message: "Alert resolved successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
