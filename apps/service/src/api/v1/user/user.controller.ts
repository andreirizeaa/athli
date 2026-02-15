import { Request, Response } from 'express';
import { userService } from '../../../services/user.service';
import { asyncHandler } from '../../../utils/async-handler';
import { success, unauthorized, internalError, badRequest } from '../../../utils/http-response';
import { avatarService } from '../../../services/avatar.service';
import { getSupabaseClient } from '../../../services/supabase.service';
import { createCoachNotification, resolveCoachId, resolveClientName } from '../../../services/notification.service';
import { NOTIFICATION_TYPES, NOTIFICATION_TITLES } from '@athli/shared-types/notification-constants';

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
      return internalError(res, { message: 'Failed to update profile' });
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
   * Get user by ID (public endpoint for invite pages)
   * Only returns minimal, non-sensitive fields
   */
  fetchUser = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);

    const user = await userService.getUserById(id);

    // Only expose non-sensitive fields needed for invite/public pages
    success(res, {
      data: {
        user: {
          id: user.id,
          name: user.name,
          profilePictureUrl: user.profilePictureUrl,
          userType: user.userType,
        },
      },
    });
  });

  /**
   * Check if user can delete their account
   * Returns blockers if there are active subscriptions that need to be cancelled first
   */
  canDeleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    // Check for active client subscriptions (recurring payments to this coach)
    // We need to check subscriptions that are:
    // - active or trialing status
    // - NOT cancelled (status != 'cancelled')
    // - NOT scheduled to cancel (cancel_at_period_end = false)
    const { data: activeSubscriptions, error: subError } = await supabase
      .from('client_subscriptions')
      .select(`
        id,
        client_id,
        package_id,
        status,
        cancel_at_period_end,
        current_period_end,
        coach_packages!inner (name)
      `)
      .eq('coach_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .eq('cancel_at_period_end', false);

    if (subError) {
      console.error('Error checking active subscriptions:', subError);
      return internalError(res, { message: 'Failed to check account status' });
    }

    const activeCount = activeSubscriptions?.length || 0;

    if (activeCount > 0) {
      // Get unique package names
      const packageNames = [...new Set(activeSubscriptions?.map((s: any) => s.coach_packages?.name).filter(Boolean))];

      success(res, {
        data: {
          canDelete: false,
          reason: 'active_client_subscriptions',
          activeSubscriptionCount: activeCount,
          packageNames,
          message: `You have ${activeCount} active client subscription${activeCount === 1 ? '' : 's'}. Please cancel all client subscriptions before deleting your account.`,
        },
      });
      return;
    }

    success(res, {
      data: {
        canDelete: true,
      },
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
   * Request account deletion — creates a todo for the client's coach(es)
   */
  requestDeletion = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const supabase = getSupabaseClient();

    // Find the client's coach(es) via assignments
    const { data: assignments, error: assignError } = await supabase
      .from('coach_client_assignments')
      .select('coach_id')
      .eq('client_id', userId);

    if (assignError) {
      return internalError(res, { message: 'Failed to look up coach assignments' });
    }

    if (!assignments || assignments.length === 0) {
      return badRequest(res, { message: 'No coach assignment found' });
    }

    // Check if a pending deletion request already exists
    const { data: existing } = await supabase
      .from('coach_own_todolist')
      .select('id')
      .eq('client_id', userId)
      .eq('title', 'Requested account deletion')
      .eq('completed', false)
      .limit(1);

    if (existing && existing.length > 0) {
      return success(res, {
        message: 'Deletion request already submitted',
        data: { alreadyRequested: true },
      });
    }

    // Create a todo for each coach
    const todosToInsert = assignments.map((a) => ({
      coach_id: a.coach_id,
      title: 'Requested account deletion',
      type: 'client' as const,
      client_id: userId,
      completed: false,
    }));

    const { error: insertError } = await supabase
      .from('coach_own_todolist')
      .insert(todosToInsert);

    if (insertError) {
      return internalError(res, { message: 'Failed to create deletion request' });
    }

    success(res, {
      message: 'Deletion request submitted successfully',
      data: { alreadyRequested: false },
    });
  });

  /**
   * Handle new client signup
   */
  newClient = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { coachId, invitationToken, onboardingId } = req.body;

    console.log('[Controller] newClient called', { userId, coachId, invitationToken: invitationToken ? 'provided' : 'none', onboardingId: onboardingId || 'none' });

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
      const result = await userService.handleNewClient(userId, coachId, invitationToken, onboardingId);

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
   * Mark client as connected (called when client signs in via mobile app)
   */
  markConnected = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    await userService.markClientConnected(userId);

    // Send notification - this is always a client action
    Promise.all([resolveCoachId(userId), resolveClientName(userId)]).then(([coachId, clientName]) => {
      if (coachId) {
        const firstName = clientName?.split(' ')[0] || 'Client';
        createCoachNotification({
          coachId,
          clientId: userId,
          notificationType: NOTIFICATION_TYPES.client_connected,
          title: NOTIFICATION_TITLES.client_connected,
          description: `${firstName} connected to the app`,
          metadata: {},
        });
      }
    }).catch((err) => {
      console.error('[UserController] notification error:', err);
    });

    success(res, { message: 'Client marked as connected' });
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
      return internalError(res, { message: 'Failed to generate avatar' });
    }
  });

  /**
   * Seed demo client data for a new coach
   * Idempotent - only seeds if demo client doesn't exist
   */
  seedDemoData = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    try {
      const result = await userService.seedDemoData(userId);

      success(res, {
        message: result.seeded ? 'Demo data seeded successfully' : 'Demo data already exists',
        data: { seeded: result.seeded },
      });
    } catch (error: any) {
      console.error('Failed to seed demo data:', error);
      return internalError(res, { message: 'Failed to seed demo data' });
    }
  });
}

export const userController = new UserController();
