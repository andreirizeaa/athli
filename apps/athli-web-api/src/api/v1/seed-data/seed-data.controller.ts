import { Request, Response } from 'express';
import { success, forbidden, unauthorized, internalError } from '../../../utils/http-response';
import { seedDataService } from './seed-data.service';

export const seedDataController = {
  /**
   * Add seed data for development testing
   */
  addSeedData: async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      forbidden(res, { message: 'Seed data operations are only available in development mode' });
      return;
    }

    try {
      const result = await seedDataService.addSeedData(userId);

      success(res, {
        message: 'Seed data created successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Error adding seed data:', error);
      internalError(res, { message: error.message || 'Failed to add seed data' });
    }
  },

  /**
   * Remove seed data
   */
  removeSeedData: async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      forbidden(res, { message: 'Seed data operations are only available in development mode' });
      return;
    }

    try {
      const result = await seedDataService.removeSeedData(userId);

      success(res, {
        message: 'Seed data removed successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Error removing seed data:', error);
      internalError(res, { message: error.message || 'Failed to remove seed data' });
    }
  },
};
