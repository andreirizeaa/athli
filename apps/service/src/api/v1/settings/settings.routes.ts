import { Router } from 'express';
import { settingsController } from './settings.controller';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';

export const settingsRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Coach settings management
 */

// Notifications
/**
 * @swagger
 * /api/v1/settings/coach/notifications:
 *   get:
 *     summary: Get coach notifications settings
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications settings retrieved successfully
 */
settingsRouter.get('/coach/notifications', supabaseAuthenticate, settingsController.getNotifications);

/**
 * @swagger
 * /api/v1/settings/coach/notifications:
 *   patch:
 *     summary: Update coach notifications settings
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Notifications settings updated successfully
 */
settingsRouter.patch('/coach/notifications', supabaseAuthenticate, settingsController.updateNotifications);
settingsRouter.patch('/coach/notifications/bulk', supabaseAuthenticate, settingsController.bulkUpdateNotifications);

// Preferences
/**
 * @swagger
 * /api/v1/settings/coach/preferences:
 *   get:
 *     summary: Get coach preferences
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
 */
settingsRouter.get('/coach/preferences', supabaseAuthenticate, settingsController.getPreferences);

/**
 * @swagger
 * /api/v1/settings/coach/preferences:
 *   patch:
 *     summary: Update coach preferences
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *               language:
 *                 type: string
 *               timezone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 */
settingsRouter.patch('/coach/preferences', supabaseAuthenticate, settingsController.updatePreferences);

// Company
/**
 * @swagger
 * /api/v1/settings/coach/company:
 *   get:
 *     summary: Get coach company information
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Company information retrieved successfully
 */
settingsRouter.get('/coach/company', supabaseAuthenticate, settingsController.getCompany);

/**
 * @swagger
 * /api/v1/settings/coach/company:
 *   patch:
 *     summary: Update coach company information
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Company information updated successfully
 */
settingsRouter.patch('/coach/company', supabaseAuthenticate, settingsController.updateCompany);

// Push Tokens
/**
 * @swagger
 * /api/v1/settings/coach/push-token:
 *   post:
 *     summary: Register a push token for the coach
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expoPushToken
 *             properties:
 *               expoPushToken:
 *                 type: string
 *               deviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Push token registered successfully
 */
settingsRouter.post('/coach/push-token', supabaseAuthenticate, settingsController.registerPushToken);

/**
 * @swagger
 * /api/v1/settings/coach/push-token:
 *   delete:
 *     summary: Delete a push token (e.g., on logout)
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expoPushToken
 *             properties:
 *               expoPushToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Push token deleted successfully
 */
settingsRouter.delete('/coach/push-token', supabaseAuthenticate, settingsController.deletePushToken);

// Client Push Tokens
/**
 * @swagger
 * /api/v1/settings/client/push-token:
 *   post:
 *     summary: Register a push token for a client
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expoPushToken
 *             properties:
 *               expoPushToken:
 *                 type: string
 *               deviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client push token registered successfully
 */
settingsRouter.post('/client/push-token', supabaseAuthenticate, settingsController.registerClientPushToken);

/**
 * @swagger
 * /api/v1/settings/client/push-token:
 *   delete:
 *     summary: Delete a client push token (e.g., on logout)
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expoPushToken
 *             properties:
 *               expoPushToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client push token deleted successfully
 */
settingsRouter.delete('/client/push-token', supabaseAuthenticate, settingsController.deleteClientPushToken);

// Unique Code
/**
 * @swagger
 * /api/v1/settings/coach/unique-code:
 *   get:
 *     summary: Get coach unique code
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Coach unique code retrieved successfully
 */
settingsRouter.get('/coach/unique-code', supabaseAuthenticate, settingsController.getUniqueCode);
