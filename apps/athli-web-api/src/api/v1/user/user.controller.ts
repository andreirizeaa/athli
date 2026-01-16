import { Request, Response } from 'express';
import { userService } from '../../../services/user.service';
import { asyncHandler } from '../../../utils/async-handler';
import { success, unauthorized, internalError, badRequest } from '../../../utils/http-response';
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

    console.log('[Controller] newClient called', { userId, coachId, invitationToken: invitationToken ? 'provided' : 'none' });

    if (!userId) {
      console.error('[Controller] User not authenticated');
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    if (!coachId) {
      console.error('[Controller] Missing coachId');
      badRequest(res, { message: 'Coach ID is required' });
      return;
    }

    try {
      const result = await userService.handleNewClient(userId, coachId, invitationToken);

      console.log('[Controller] ✅ Client profile created/verified successfully', { userId, coachId, isNew: result.isNew });

      success(res, {
        message: result.isNew ? 'Client profile created successfully' : 'Client profile already exists',
        data: {
          profile: result.profile,
          isNew: result.isNew,
        },
      });
    } catch (error: any) {
      console.error('[Controller] FAILED to create client profile', {
        userId,
        coachId,
        error: error.message,
        stack: error.stack
      });
      throw error; // Re-throw to let asyncHandler handle it
    }
  });

  /**
   * Generate default avatar for user (if they don't have one)
   * Used for OAuth signups without profile pictures (Apple, etc.)
   */
  generateAvatar = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { userName } = req.body;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    if (!userName) {
      badRequest(res, { message: 'User name is required' });
      return;
    }

    try {
      // Use the helper to ensure avatar exists (won't overwrite if already present)
      const avatarUrl = await avatarService.ensureUserHasAvatar(userId, userName);

      success(res, {
        message: avatarUrl ? 'Avatar generated successfully' : 'User already has avatar',
        data: { avatarUrl },
      });
    } catch (error: any) {
      console.error('Failed to generate avatar:', error);
      return internalError(res, { message: error.message || 'Failed to generate avatar' });
    }
  });
}

export const userController = new UserController();
