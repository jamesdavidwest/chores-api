// src/routes/security.routes.js

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiKey:
 *       type: object
 *       required:
 *         - name
 *         - permissions
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           readOnly: true
 *         name:
 *           type: string
 *           example: "Backend Service Key"
 *         key:
 *           type: string
 *           writeOnly: true
 *           example: "sk_live_123...abc"
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *           example: ["READ_METRICS", "WRITE_EVENTS"]
 *         lastUsed:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *         expiresAt:
 *           type: string
 *           format: date-time
 *
 *     SecurityAuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           readOnly: true
 *         action:
 *           type: string
 *           enum: [LOGIN_ATTEMPT, PASSWORD_CHANGE, API_KEY_CREATED, API_KEY_REVOKED, PERMISSION_CHANGED]
 *         status:
 *           type: string
 *           enum: [SUCCESS, FAILURE]
 *         userId:
 *           type: string
 *         ipAddress:
 *           type: string
 *         userAgent:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         metadata:
 *           type: object
 *           additionalProperties: true
 *
 * tags:
 *   - name: Security
 *     description: Security and access control endpoints
 */

/**
 * @swagger
 * /api/v1/security/api-keys:
 *   post:
 *     summary: Create a new API key
 *     description: Creates a new API key with specified permissions. Key value is only returned once.
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - permissions
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Backend Service Key"
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["READ_METRICS", "WRITE_EVENTS"]
 *               expiresIn:
 *                 type: string
 *                 example: "90d"
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ApiKey'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Insufficient permissions
 *
 *   get:
 *     summary: List all API keys
 *     description: Retrieves all API keys for the current user or instance
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, revoked]
 *         description: Filter keys by status
 *     responses:
 *       200:
 *         description: List of API keys
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
 *                     $ref: '#/components/schemas/ApiKey'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /api/v1/security/api-keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     description: Immediately revokes an API key making it invalid for future requests
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: API key revoked successfully
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
 *                       example: "API key revoked successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: API key not found
 *
 * /api/v1/security/audit-logs:
 *   get:
 *     summary: Retrieve security audit logs
 *     description: Gets the security audit trail with various filter options
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SUCCESS, FAILURE]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of audit log entries
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
 *                     $ref: '#/components/schemas/SecurityAuditLog'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Insufficient permissions
 *
 * /api/v1/security/permissions:
 *   get:
 *     summary: List all available permissions
 *     description: Retrieves all possible permissions in the system
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
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
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                         example: "READ_METRICS"
 *                       description:
 *                         type: string
 *                         example: "Ability to read system metrics"
 *                       category:
 *                         type: string
 *                         example: "Monitoring"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /api/v1/security/rate-limits:
 *   get:
 *     summary: Get current rate limit status
 *     description: Returns current rate limit counters and configurations
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rate limit information
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
 *                     limit:
 *                       type: integer
 *                       example: 1000
 *                     remaining:
 *                       type: integer
 *                       example: 997
 *                     resetAt:
 *                       type: string
 *                       format: date-time
 *                     window:
 *                       type: string
 *                       example: "1h"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /api/v1/security/csrf-token:
 *   get:
 *     summary: Get CSRF token
 *     description: Retrieves a new CSRF token for form submissions
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: New CSRF token
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
 *                     token:
 *                       type: string
 *                       example: "abc123def456..."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'**/
