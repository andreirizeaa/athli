import { Router } from 'express';

export const clientBaseRouter = Router();

/**
 * @swagger
 * /api/v1/client:
 *   get:
 *     summary: Get client profile
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client profile retrieved successfully
 */
clientBaseRouter.get('/', (req, res) => {
    res.json({ message: 'Client base route' });
});

/**
 * @swagger
 * /api/v1/client:
 *   patch:
 *     summary: Update client profile
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Client profile updated successfully
 */
clientBaseRouter.patch('/', (req, res) => {
    res.json({ message: 'Client profile updated' });
});

/**
 * @swagger
 * /api/v1/client:
 *   post:
 *     summary: Create client profile
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Client profile created successfully
 *   delete:
 *     summary: Delete client profile
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client profile deleted successfully
 */
clientBaseRouter.post('/', (req, res) => {
    res.json({ message: 'Client profile created' });
});

clientBaseRouter.delete('/', (req, res) => {
    res.json({ message: 'Client profile deleted' });
});
