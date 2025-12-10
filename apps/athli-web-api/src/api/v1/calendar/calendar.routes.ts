import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  calendarCallbackController,
  calendarDisconnectController,
  calendarEventsController,
  calendarStatusController,
} from './calendar.controller';

export const calendarRouter = Router();

/**
 * @swagger
 * /api/v1/calendar/callback:
 *   post:
 *     summary: Store calendar OAuth tokens
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - access_token
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, outlook, azure]
 *               access_token:
 *                 type: string
 *               provider_access_token:
 *                 type: string
 *               refresh_token:
 *                 type: string
 *               provider_refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens saved successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 */
calendarRouter.post('/callback', ...requireAuth, calendarCallbackController);

/**
 * @swagger
 * /api/v1/calendar/disconnect:
 *   delete:
 *     summary: Disconnect calendar account
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Calendar disconnected successfully
 *       401:
 *         description: Unauthorized
 */
calendarRouter.delete('/disconnect', ...requireAuth, calendarDisconnectController);

/**
 * @swagger
 * /api/v1/calendar/events:
 *   get:
 *     summary: Get calendar events
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeMin
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start time for events
 *       - in: query
 *         name: timeMax
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End time for events
 *     responses:
 *       200:
 *         description: List of calendar events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   summary:
 *                     type: string
 *                   start:
 *                     type: object
 *                   end:
 *                     type: object
 *       400:
 *         description: No calendar linked
 *       401:
 *         description: Unauthorized or expired token
 */
calendarRouter.get('/events', ...requireAuth, calendarEventsController);

/**
 * @swagger
 * /api/v1/calendar/status:
 *   get:
 *     summary: Check calendar connection status
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Calendar connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                 provider:
 *                   type: string
 *                   enum: [google, outlook]
 *       401:
 *         description: Unauthorized
 */
calendarRouter.get('/status', ...requireAuth, calendarStatusController);

