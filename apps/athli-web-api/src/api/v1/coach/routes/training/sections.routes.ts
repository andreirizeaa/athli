import { Router } from 'express';

import { coachSectionsController } from '../../coach-sections.controller';
import { supabaseAuthenticate } from '../../../../../middlewares/supabase-auth';

export const coachSectionRouter = Router();

/**
 * @swagger
 * /api/v1/coach/training/sections:
 *   get:
 *     summary: Get coach sections
 *     tags: [Coach Training]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach sections retrieved successfully
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
 *                         sections:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/CoachSection'
 */
coachSectionRouter.get('/', supabaseAuthenticate, coachSectionsController.getSections);

/**
 * @swagger
 * /api/v1/coach/training/sections:
 *   post:
 *     summary: Create coach section
 *     tags: [Coach Training]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCoachSectionInput'
 *     responses:
 *       201:
 *         description: Coach section created successfully
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
 *                         section:
 *                           $ref: '#/components/schemas/CoachSection'
 */
coachSectionRouter.post('/', supabaseAuthenticate, coachSectionsController.createSection);

coachSectionRouter.post('/bulk', supabaseAuthenticate, coachSectionsController.getSectionsByIds);

coachSectionRouter.post('/get', supabaseAuthenticate, coachSectionsController.getSectionById);

coachSectionRouter.post('/update', supabaseAuthenticate, coachSectionsController.updateSection);

coachSectionRouter.post('/delete', supabaseAuthenticate, coachSectionsController.deleteSection);

coachSectionRouter.post('/duplicate', supabaseAuthenticate, coachSectionsController.duplicateSection);

coachSectionRouter.post('/toggle-favorite', supabaseAuthenticate, coachSectionsController.toggleFavorite);
