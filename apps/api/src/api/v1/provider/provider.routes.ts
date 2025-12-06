import { Router } from 'express';
import { detectProviderController } from './provider.controller';

export const providerRouter = Router();

/**
 * @swagger
 * /api/v1/provider/detect:
 *   get:
 *     summary: Detect email provider from email address
 *     tags: [Provider]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email address to detect provider for
 *     responses:
 *       200:
 *         description: Provider detected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 provider:
 *                   type: string
 *                   enum: [google, outlook, null]
 *                   nullable: true
 *       400:
 *         description: Invalid email format
 */
providerRouter.get('/detect', detectProviderController);

