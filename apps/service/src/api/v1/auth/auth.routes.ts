import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../../middlewares/validate';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';
import {
  loginRateLimiter,
  otpRateLimiter,
  passwordResetRateLimiter,
  registrationRateLimiter,
  authCheckRateLimiter,
} from '../../../middlewares/rate-limit';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendOTPSchema,
  forgotPasswordSchema,
  checkAuthProviderSchema,
  resetPasswordSchema,
  googleAuthSchema,
  sendSecurityOTPSchema,
  verifySecurityOTPSchema,
  newClientSchema,
} from './auth.schemas';

export const authRouter = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
authRouter.post('/register', registrationRateLimiter, validate(registerSchema), authController.register);

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify email with OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
authRouter.post('/verify-email', otpRateLimiter, validate(verifyEmailSchema), authController.verifyEmail);

/**
 * @swagger
 * /api/v1/auth/resend-otp:
 *   post:
 *     summary: Resend OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
authRouter.post('/resend-otp', passwordResetRateLimiter, validate(resendOTPSchema), authController.resendOTP);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
authRouter.post('/login', loginRateLimiter, validate(loginSchema), authController.login);

/**
 * @swagger
 * /api/v1/auth/check-auth-provider:
 *   post:
 *     summary: Check auth provider for a user by email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Auth provider info returned
 */
authRouter.post('/check-auth-provider', authCheckRateLimiter, validate(checkAuthProviderSchema), authController.checkAuthProvider);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
authRouter.post('/forgot-password', passwordResetRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
authRouter.post('/reset-password', otpRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

/**
 * @swagger
 * /api/v1/auth/google:
 *   post:
 *     summary: Google OAuth login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
authRouter.post('/google', loginRateLimiter, validate(googleAuthSchema), authController.googleAuth);


/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
authRouter.post('/logout', supabaseAuthenticate, authController.logout);

/**
 * @swagger
 * /api/v1/auth/send-security-otp:
 *   post:
 *     summary: Send OTP for security verification (password/email changes)
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Security OTP sent successfully
 */
authRouter.post('/send-security-otp', supabaseAuthenticate, validate(sendSecurityOTPSchema), authController.sendSecurityOTP);

/**
 * @swagger
 * /api/v1/auth/verify-security-otp:
 *   post:
 *     summary: Verify OTP for security verification
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified successfully
 */
authRouter.post('/verify-security-otp', otpRateLimiter, supabaseAuthenticate, validate(verifySecurityOTPSchema), authController.verifySecurityOTP);

