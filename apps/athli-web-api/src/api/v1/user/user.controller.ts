import { Request, Response } from 'express';
import { userService } from '../../../services/user.service';
import { asyncHandler } from '../../../utils/async-handler';
import { success, unauthorized, internalError } from '../../../utils/http-response';
import { avatarService } from '../../../services/avatar.service';

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
    const file = req.file;

    try {
      const user = await userService.updateUserProfile(userId, updates, file as any);

      success(res, {
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return internalError(res, { message: error.message || 'Failed to update profile' });
    }
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
   * Ensure coach profile exists for current user
   */
  ensureCoachProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    const user = await userService.ensureCoachProfile(userId);

    success(res, {
      message: 'Coach profile ready',
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

  /**
   * Delete user account
   */
  deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    await userService.deleteAccount(userId);

    success(res, {
      message: 'Account deleted successfully',
    });
  });

  /**
   * Handle new client signup
   */
  newClient = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { coachId, invitationToken } = req.body;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const result = await userService.handleNewClient(userId, coachId, invitationToken);

    success(res, {
      message: result.isNew ? 'Client profile created successfully' : 'Client profile already exists',
      data: {
        profile: result.profile,
        isNew: result.isNew,
      },
    });
  });
}

export const userController = new UserController();
