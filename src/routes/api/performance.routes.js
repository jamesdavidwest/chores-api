const express = require('express');
const router = express.Router();
const PerformanceReportService = require('../../services/PerformanceReportService');
const MetricsCollector = require('../../../tests/benchmarks/collectors/MetricsCollector');
const logger = require('../../services/LoggerService');

// Start automated reporting (if enabled in environment)
if (process.env.ENABLE_AUTOMATED_PERFORMANCE_REPORTS === 'true') {
  PerformanceReportService.startAutomatedReporting();
}

/**
 * @swagger
 * /api/v1/performance/metrics:
 *   get:
 *     summary: Get current performance metrics
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = MetricsCollector.getReport();
    res.success(metrics);
  } catch (error) {
    logger.error('Error fetching performance metrics', {
      error: error.message
    });
    res.error({
      code: 'METRICS_ERROR',
      message: 'Error fetching performance metrics'
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/report:
 *   post:
 *     summary: Generate on-demand performance report
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [txt, json, html]
 *               save:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Generated performance report
 */
router.post('/report', async (req, res) => {
  try {
    const { format, save } = req.body;
    const report = await PerformanceReportService.generateOnDemandReport({
      format,
      save
    });
    res.success(report);
  } catch (error) {
    logger.error('Error generating performance report', {
      error: error.message,
      body: req.body
    });
    res.error({
      code: 'REPORT_GENERATION_ERROR',
      message: 'Error generating performance report'
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/config:
 *   get:
 *     summary: Get performance reporting configuration
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current performance reporting configuration
 */
router.get('/config', (req, res) => {
  const config = PerformanceReportService.getConfig();
  res.success(config);
});

/**
 * @swagger
 * /api/v1/performance/config:
 *   put:
 *     summary: Update performance reporting configuration
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               interval:
 *                 type: number
 *               formats:
 *                 type: array
 *                 items:
 *                   type: string
 *               retentionDays:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated configuration
 */
router.put('/config', (req, res) => {
  try {
    PerformanceReportService.updateConfig(req.body);
    const updatedConfig = PerformanceReportService.getConfig();
    res.success(updatedConfig);
  } catch (error) {
    logger.error('Error updating performance config', {
      error: error.message,
      body: req.body
    });
    res.error({
      code: 'CONFIG_UPDATE_ERROR',
      message: 'Error updating performance configuration'
    });
  }
});

/**
 * @swagger
 * /api/v1/performance/reporting:
 *   post:
 *     summary: Control automated reporting
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [start, stop]
 *     responses:
 *       200:
 *         description: Reporting status updated
 */
router.post('/reporting', (req, res) => {
  try {
    const { action } = req.body;
    
    if (action === 'start') {
      PerformanceReportService.startAutomatedReporting();
    } else if (action === 'stop') {
      PerformanceReportService.stopAutomatedReporting();
    } else {
      return res.error({
        code: 'INVALID_ACTION',
        message: 'Invalid action. Use "start" or "stop"'
      });
    }

    const config = PerformanceReportService.getConfig();
    res.success({
      message: `Automated reporting ${action}ed`,
      config
    });
  } catch (error) {
    logger.error('Error controlling automated reporting', {
      error: error.message,
      body: req.body
    });
    res.error({
      code: 'REPORTING_CONTROL_ERROR',
      message: 'Error controlling automated reporting'
    });
  }
});

module.exports = router;