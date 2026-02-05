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
   * Check auth provider for a user
   */
  checkAuthProvider = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const result = await authService.checkAuthProvider(email);

    success(res, {
      message: 'Auth provider checked successfully',
      data: result,
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

      if (!payload.email) {
        return unauthorized(res, { message: 'Google account has no verified email' });
      }

      const googleUser = {
        email: payload.email,
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

}

export const authController = new AuthController();
