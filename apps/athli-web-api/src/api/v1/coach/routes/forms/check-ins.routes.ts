import { Router } from 'express';
import { coachCheckInsController } from '../../coach-check-ins.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const coachCheckInRouter = Router();

/**
 * @swagger
 * /api/v1/coach/forms/check-ins:
 *   get:
 *     summary: Get coach check-ins
 *     tags: [Coach Forms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach check-ins retrieved successfully
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
 *                         checkIns:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/CoachCheckIn'
 */
coachCheckInRouter.get('/', supabaseAuthenticate, coachCheckInsController.getCheckIns);

/**
 * @swagger
 * /api/v1/coach/forms/check-ins/reviews:
 *   get:
 *     summary: Get coach check-ins awaiting review
 *     tags: [Coach Forms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach check-in reviews retrieved successfully
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
 *                         reviews:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               checkin_log_id:
 *                                 type: string
 *                               client_id:
 *                                 type: string
 *                               coach_checkin_id:
 *                                 type: string
 *                               client_name:
 *                                 type: string
 *                               client_avatar:
 *                                 type: string
 *                               client_email:
 *                                 type: string
 *                               checkin_name:
 *                                 type: string
 *                               checkin_description:
 *                                 type: string
 *                               submission_date:
 *                                 type: string
 *                               status:
 *                                 type: string
 *                               updated_at:
 *                                 type: string
 */
coachCheckInRouter.get('/reviews', supabaseAuthenticate, coachCheckInsController.getCheckInReviews);

/**
 * @swagger
 * /api/v1/coach/forms/check-ins/{id}:
 *   get:
 *     summary: Get coach check-in by ID
 *     tags: [Coach Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coach check-in retrieved successfully
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
 *                         checkIn:
 *                           $ref: '#/components/schemas/CoachCheckIn'
 */
coachCheckInRouter.get('/:id', supabaseAuthenticate, coachCheckInsController.getCheckInById);

/**
 * @swagger
 * /api/v1/coach/forms/check-ins/{id}:
 *   patch:
 *     summary: Update coach check-in
 *     tags: [Coach Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCoachCheckInInput'
 *     responses:
 *       200:
 *         description: Coach check-in updated successfully
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
 *                         checkIn:
 *                           $ref: '#/components/schemas/CoachCheckIn'
 */
coachCheckInRouter.patch('/:id', supabaseAuthenticate, coachCheckInsController.updateCheckIn);

/**
 * @swagger
 * /api/v1/coach/forms/check-ins:
 *   post:
 *     summary: Create coach check-in
 *     tags: [Coach Forms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCoachCheckInInput'
 *     responses:
 *       201:
 *         description: Coach check-in created successfully
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
 *                         checkIn:
 *                           $ref: '#/components/schemas/CoachCheckIn'
 */
coachCheckInRouter.post('/', supabaseAuthenticate, coachCheckInsController.createCheckIn);

/**
 * @swagger
 * /api/v1/coach/forms/check-ins/{id}:
 *   delete:
 *     summary: Delete coach check-in
 *     tags: [Coach Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coach check-in deleted successfully
 */
coachCheckInRouter.delete('/:id', supabaseAuthenticate, coachCheckInsController.deleteCheckIn);
