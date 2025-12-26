import { Request, Response } from 'express';
import { success } from '../../../utils/http-response';

export const exercisesController = {
    /**
     * Get all exercises
     */
    getExercises: async (req: Request, res: Response) => {
        success(res, {
            message: 'Exercises retrieved successfully',
            data: {
                exercises: [],
            },
        });
    },
};
