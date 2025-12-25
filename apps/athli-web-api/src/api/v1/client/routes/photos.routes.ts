import { Router } from 'express';

export const clientPhotoRouter = Router();

/**
 * @swagger
 * /api/v1/client/photos:
 *   get:
 *     summary: Get client photos
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client photos retrieved successfully
 */
clientPhotoRouter.get('/', (req, res) => {
    res.json({ message: 'Client photos route' });
});

/**
 * @swagger
 * /api/v1/client/photos/{id}:
 *   patch:
 *     summary: Update client photo
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
 *         description: Client photo updated successfully
 */
clientPhotoRouter.patch('/:id', (req, res) => {
    res.json({ message: 'Client photo updated', id: req.params.id });
});

/**
 * @swagger
 * /api/v1/client/photos:
 *   post:
 *     summary: Create client photo
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
 *         description: Client photo created successfully
 *
 * /api/v1/client/photos/{id}:
 *   delete:
 *     summary: Delete client photo
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
 *         description: Client photo deleted successfully
 */
clientPhotoRouter.post('/', (req, res) => {
    res.json({ message: 'Client photo created' });
});

clientPhotoRouter.delete('/:id', (req, res) => {
    res.json({ message: 'Client photo deleted', id: req.params.id });
});
