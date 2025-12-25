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
