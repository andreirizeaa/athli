import { Router } from 'express';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';
import { coachChecklistController } from '../../coach-checklist.controller';

export const coachChecklistRouter = Router();

/**
 * @swagger
 * /api/v1/coach/new/checklist:
 *   get:
 *     summary: Get getting started checklist
 *     description: Retrieve the getting started checklist for the authenticated coach
 *     tags: [Coach - New]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Checklist retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Getting started checklist retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     checklist:
 *                       type: object
 *                       properties:
 *                         coach_id:
 *                           type: string
 *                           format: uuid
 *                         client_app_demo:
 *                           type: boolean
 *                         coach_app_demo:
 *                           type: boolean
 *                         workout_ai:
 *                           type: boolean
 *                         program_templates:
 *                           type: boolean
 *                         custom_exercises:
 *                           type: boolean
 *                         automate_onboardings:
 *                           type: boolean
 *                         check_ins_forms:
 *                           type: boolean
 *                         powerful_flows:
 *                           type: boolean
 *                         lifestyle_habits:
 *                           type: boolean
 *                         track_metrics:
 *                           type: boolean
 *                         on_demand_resources:
 *                           type: boolean
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
coachChecklistRouter.get('/', supabaseAuthenticate, coachChecklistController.getChecklist);
coachChecklistRouter.patch('/', supabaseAuthenticate, coachChecklistController.updateChecklist);
