// src/schemas/api.schemas.js

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       required:
 *         - title
 *         - startDate
 *         - endDate
 *       properties:
 *         id:
 *           type: integer
 *           readOnly: true
 *           example: 1
 *         title:
 *           type: string
 *           example: "Annual Planning Meeting"
 *         description:
 *           type: string
 *           example: "Company-wide planning session for Q3"
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2024-12-20T09:00:00Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2024-12-20T17:00:00Z"
 *         status:
 *           type: string
 *           enum: [DRAFT, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED]
 *           example: "SCHEDULED"
 *         riskLevel:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *           example: "MEDIUM"
 *         budget:
 *           type: number
 *           format: float
 *           example: 5000.00
 *         createdAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *         metadata:
 *           type: object
 *           additionalProperties: true
 *           example: { "location": "Conference Room A", "virtualLink": "https://meet.example.com/123" }
 *
 *     Instance:
 *       type: object
 *       required:
 *         - name
 *         - type
 *       properties:
 *         id:
 *           type: integer
 *           readOnly: true
 *           example: 1
 *         name:
 *           type: string
 *           example: "Production-NA"
 *         type:
 *           type: string
 *           enum: [DEVELOPMENT, STAGING, PRODUCTION]
 *           example: "PRODUCTION"
 *         status:
 *           type: string
 *           enum: [ACTIVE, SUSPENDED, MAINTENANCE]
 *           example: "ACTIVE"
 *         config:
 *           type: object
 *           properties:
 *             maxUsers:
 *               type: integer
 *               example: 1000
 *             features:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["SSO", "API_ACCESS", "ADVANCED_REPORTING"]
 *         createdAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *
 *     PerformanceMetrics:
 *       type: object
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-12-14T12:00:00Z"
 *         cpu:
 *           type: object
 *           properties:
 *             usage:
 *               type: number
 *               format: float
 *               example: 45.2
 *             temperature:
 *               type: number
 *               format: float
 *               example: 72.5
 *         memory:
 *           type: object
 *           properties:
 *             used:
 *               type: number
 *               format: float
 *               example: 4.2
 *             total:
 *               type: number
 *               format: float
 *               example: 16.0
 *             percentage:
 *               type: number
 *               format: float
 *               example: 26.25
 *         disk:
 *           type: object
 *           properties:
 *             used:
 *               type: number
 *               format: float
 *               example: 80.5
 *             total:
 *               type: number
 *               format: float
 *               example: 500.0
 *             percentage:
 *               type: number
 *               format: float
 *               example: 16.1
 *
 *     Alert:
 *       type: object
 *       required:
 *         - type
 *         - message
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         type:
 *           type: string
 *           enum: [INFO, WARNING, ERROR, CRITICAL]
 *           example: "WARNING"
 *         message:
 *           type: string
 *           example: "High memory usage detected"
 *         source:
 *           type: string
 *           example: "memory-monitor"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-12-14T12:00:00Z"
 *         metadata:
 *           type: object
 *           additionalProperties: true
 *           example: { "memoryUsage": 92.5, "threshold": 90 }
 *
 *     MetricsQuery:
 *       type: object
 *       properties:
 *         startTime:
 *           type: string
 *           format: date-time
 *           example: "2024-12-14T00:00:00Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           example: "2024-12-14T23:59:59Z"
 *         metrics:
 *           type: array
 *           items:
 *             type: string
 *           example: ["cpu", "memory", "disk"]
 *         interval:
 *           type: string
 *           enum: [1m, 5m, 15m, 1h, 1d]
 *           example: "15m"
 *         instanceId:
 *           type: integer
 *           example: 1
 *
 *     WebSocketMessage:
 *       type: object
 *       required:
 *         - type
 *         - payload
 *       properties:
 *         type:
 *           type: string
 *           enum: [METRICS_UPDATE, ALERT, STATUS_CHANGE]
 *           example: "METRICS_UPDATE"
 *         payload:
 *           type: object
 *           additionalProperties: true
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-12-14T12:00:00Z"
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *     apiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: X-API-Key
 */

module.exports = {};
