import { Request, Response } from 'express';
import { authService } from '../../../services/auth.service';
import { asyncHandler } from '../../../utils/async-handler';
import { success, created, unauthorized } from '../../../utils/http-response';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export class AuthController {
  /**
   * Register new user
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    const result = await authService.register({
      email,
      password,
      name,
    });

    created(res, {
      message: 'User registered successfully. Please verify your email.',
      data: {
        userId: result.userId,
        requiresVerification: result.requiresVerification,
      },
    });
  });

  /**
   * Verify email with OTP
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    const result = await authService.verifyEmail(email, otp);

    success(res, {
      message: 'Email verified successfully',
      data: {
        token: result.token,
        user: result.user,
      },
    });
  });

  /**
   * Resend OTP
   */
  resendOTP = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    await authService.resendOTP(email);

    success(res, {
      message: 'OTP sent successfully',
    });
  });

  /**
   * Login user
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    success(res, {
      message: 'Login successful',
      data: {
        token: result.token,
        user: result.user,
      },
    });
  });

  /**
   * Forgot password - send OTP
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    await authService.forgotPassword(email);

    success(res, {
      message: 'Password reset OTP sent to your email',
    });
  });

  /**
   * Reset password with OTP
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;

    await authService.resetPassword(email, otp, newPassword);

    success(res, {
      message: 'Password reset successfully',
    });
  });

  /**
   * Google OAuth login
   */
  googleAuth = asyncHandler(async (req: Request, res: Response) => {
    const { credential } = req.body;

    try {
      // Verify the Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return unauthorized(res, { message: 'Invalid Google token' });
      }

      const googleUser = {
        email: payload.email!,
        name: payload.name || '',
        picture: payload.picture,
        sub: payload.sub,
      };

      const result = await authService.handleGoogleAuth(googleUser);

      success(res, {
        message: result.isNew ? 'Account created successfully' : 'Login successful',
        data: {
          token: result.token,
          user: result.user,
          isNew: result.isNew,
        },
      });
    } catch (error) {
      console.error('Google auth error:', error);
      unauthorized(res, { message: 'Google authentication failed' });
    }
  });

  /**
   * Get current user
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    const user = await authService.getUserById(userId);

    if (!user) {
      unauthorized(res, { message: 'User not found' });
      return;
    }

    success(res, {
      data: { user },
    });
  });

  /**
   * Logout (client-side token removal)
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    success(res, {
      message: 'Logout successful',
    });
  });

  /**
   * Send OTP for security verification
   */
  sendSecurityOTP = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    await authService.sendSecurityOTP(email);

    success(res, {
      message: 'Security verification OTP sent successfully',
    });
  });

  /**
   * Verify OTP for security verification
   */
  verifySecurityOTP = asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    const result = await authService.verifySecurityOTP(email, otp);

    success(res, {
      message: result.valid ? 'OTP verified successfully' : 'Invalid OTP',
      data: { valid: result.valid },
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

    await authService.deleteAccount(userId);

    success(res, {
      message: 'Account deleted successfully',
    });
  });

  /**
   * Handle new client signup - checks if coach profile exists, creates client profile if needed
   */
  newClient = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { coachId } = req.body;

    if (!userId) {
      unauthorized(res, { message: 'User not authenticated' });
      return;
    }

    const result = await authService.handleNewClient(userId, coachId);

    success(res, {
      message: result.isNew ? 'Client profile created successfully' : 'Client profile already exists',
      data: {
        profile: result.profile,
        isNew: result.isNew,
      },
    });
  });
}

export const authController = new AuthController();
