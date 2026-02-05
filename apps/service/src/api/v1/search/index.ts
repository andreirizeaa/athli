import { Router } from 'express';
import { searchController } from './search.controller';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';

const router = Router();

// Apply auth middleware to all search routes
router.use(supabaseAuthenticate);

/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     summary: Global search across coach resources
 *     description: Search across metrics, habits, files, workouts, programs, and exercises
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     metrics:
 *                       type: array
 *                       items:
 *                         type: object
 *                     habits:
 *                       type: array
 *                       items:
 *                         type: object
 *                     files:
 *                       type: array
 *                       items:
 *                         type: object
 *                     workouts:
 *                       type: array
 *                       items:
 *                         type: object
 *                     programs:
 *                       type: array
 *                       items:
 *                         type: object
 *                     exercises:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/', searchController.globalSearch);

export default router;
