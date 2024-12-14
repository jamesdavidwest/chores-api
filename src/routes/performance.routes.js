// src/routes/performance.routes.js

/**
 * @swagger
 * tags:
 *   - name: Performance
 *     description: Performance monitoring and metrics endpoints
 */

/**
 * @swagger
 * /api/v1/performance/metrics:
 *   get:
 *     summary: Get current performance metrics
 *     description: Retrieves current system performance metrics
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: types
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [cpu, memory, disk, network]
 *         style: form
 *         explode: true
 *         description: Types of metrics to retrieve
 *     responses:
 *       200:
 *         description: Current performance metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PerformanceMetrics'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Insufficient permissions
 *
 * /api/v1/performance/metrics/history:
 *   post:
 *     summary: Query historical performance metrics
 *     description: Retrieves historical performance metrics based on query parameters
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MetricsQuery'
 *     responses:
 *       200:
 *         description: Historical metrics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PerformanceMetrics'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Insufficient permissions
 *
 * /api/v1/performance/alerts:
 *   get:
 *     summary: Get performance alerts
 *     description: Retrieves current and recent performance alerts
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, resolved, all]
 *         description: Filter alerts by status
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [info, warning, error, critical]
 *         description: Filter alerts by severity level
 *     responses:
 *       200:
 *         description: List of performance alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alert'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Insufficient permissions
 *
 * /api/v1/performance/websocket:
 *   get:
 *     summary: WebSocket connection info for real-time metrics
 *     description: Returns WebSocket connection details for real-time performance monitoring
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: WebSocket connection information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       example: "wss://api.example.com/ws/metrics"
 *                     protocols:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["v1.metrics.performance"]
 *                     token:
 *                       type: string
 *                       description: Token for WebSocket authentication
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Insufficient permissions
 */

/**
 * @swagger
 * /api/v1/performance/config:
 *   get:
 *     summary: Get performance monitoring configuration
 *     description: Retrieves current performance monitoring settings
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance monitoring configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         collectionInterval:
 *                           type: string
 *                           example: "1m"
 *                         retentionPeriod:
 *                           type: string
 *                           example: "30d"
 *                     alerts:
 *                       type: object
 *                       properties:
 *                         thresholds:
 *                           type: object
 *                           properties:
 *                             cpu:
 *                               type: number
 *                               example: 80
 *                             memory:
 *                               type: number
 *                               example: 90
 *                             disk:
 *                               type: number
 *                               example: 85
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 *   put:
 *     summary: Update performance monitoring configuration
 *     description: Updates performance monitoring settings
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
 *               metrics:
 *                 type: object
 *                 properties:
 *                   collectionInterval:
 *                     type: string
 *                     example: "1m"
 *                   retentionPeriod:
 *                     type: string
 *                     example: "30d"
 *               alerts:
 *                 type: object
 *                 properties:
 *                   thresholds:
 *                     type: object
 *                     properties:
 *                       cpu:
 *                         type: number
 *                         example: 80
 *                       memory:
 *                         type: number
 *                         example: 90
 *                       disk:
 *                         type: number
 *                         example: 85
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Configuration updated successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Insufficient permissions
 */
