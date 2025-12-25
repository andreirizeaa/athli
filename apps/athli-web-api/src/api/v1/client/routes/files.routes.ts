import { Router } from 'express';

export const clientFileRouter = Router();

/**
 * @swagger
 * /api/v1/client/files:
 *   get:
 *     summary: Get client files
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client files retrieved successfully
 */
clientFileRouter.get('/', (req, res) => {
    res.json({ message: 'Client files route' });
});

/**
 * @swagger
 * /api/v1/client/files/{id}:
 *   patch:
 *     summary: Update client file
 *     tags: [Client]
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
 *             type: object
 *     responses:
 *       200:
 *         description: Client file updated successfully
 */
clientFileRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Client file updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/client/files:
 *   post:
 *     summary: Create client file
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
 *         description: Client file created successfully
 *
 * /api/v1/client/files/{id}:
 *   delete:
 *     summary: Delete client file
 *     tags: [Client]
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
 *         description: Client file deleted successfully
 */
clientFileRouter.post('/', (req, res) => {
    res.json({ message: 'Client file created' });
});

clientFileRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Client file deleted', id: req.params.id });
});
