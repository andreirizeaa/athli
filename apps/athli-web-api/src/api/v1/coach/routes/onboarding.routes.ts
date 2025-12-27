import { Router } from 'express';
import { coachOnboardingController } from '../coach-onboarding.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const coachOnboardingRouter = Router();

/**
 * @swagger
 * /api/v1/coach/onboarding:
 *   get:
 *     summary: Get or create the single onboarding flow for the coach
 *     tags: [Coach Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding flow retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         onboarding:
 *                           $ref: '#/components/schemas/CoachOnboarding'
 */
coachOnboardingRouter.get('/', supabaseAuthenticate, coachOnboardingController.getOnboarding);

/**
 * @swagger
 * /api/v1/coach/onboarding:
 *   patch:
 *     summary: Update the single onboarding flow
 *     tags: [Coach Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCoachOnboardingInput'
 *     responses:
 *       200:
 *         description: Onboarding updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         onboarding:
 *                           $ref: '#/components/schemas/CoachOnboarding'
 */
coachOnboardingRouter.patch('/', supabaseAuthenticate, coachOnboardingController.updateOnboarding);

/**
 * @swagger
 * /api/v1/coach/onboarding/publish:
 *   patch:
 *     summary: Toggle publish state of the single onboarding flow
 *     tags: [Coach Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Publish state toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         onboarding:
 *                           $ref: '#/components/schemas/CoachOnboarding'
 */
coachOnboardingRouter.patch('/publish', supabaseAuthenticate, coachOnboardingController.togglePublish);
