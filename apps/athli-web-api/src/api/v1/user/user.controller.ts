import { Request, Response } from 'express';
import { userService } from '../../../services/user.service';
import { asyncHandler } from '../../../utils/async-handler';
import { success } from '../../../utils/http-response';

export class UserController {
  /**
   * Get current user profile
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    const user = await userService.getUserProfile(userId);

    success(res, {
      data: { user },
    });
  });

  /**
   * Update user profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const updates = req.body;

    const user = await userService.updateUserProfile(userId, updates);

    success(res, {
      message: 'Profile updated successfully',
      data: { user },
    });
  });

  /**
   * Ensure client profile exists for current user
   */
  ensureClientProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { coachId } = req.body;

    const user = await userService.ensureClientProfile(userId, coachId);

    success(res, {
      message: 'Client profile ready',
      data: { user },
    });
  });

  /**
   * Get user by ID (public endpoint, no authentication required)
   */
  fetchUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await userService.getUserById(id);

    success(res, {
      data: { user },
    });
  });
}

export const userController = new UserController();
