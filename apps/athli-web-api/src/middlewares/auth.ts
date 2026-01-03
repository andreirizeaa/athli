import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from './error-handler';
import { authService } from '../services/auth.service';

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId?: string;
    sessionId?: string;
  };
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    userType: 'coach' | 'client';
    profilePictureUrl?: string | null;
    signinMethod: 'email' | 'google';
    isActive: boolean;
    createdAt: string;
  };
}

// Custom JWT authentication middleware
export const authenticate: RequestHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError(401, 'Unauthorized - Missing or invalid token'));
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);

    if (!decoded) {
      return next(new AppError(401, 'Unauthorized - Invalid token'));
    }

    // Get user details
    const user = await authService.getUserById(decoded.userId);

    if (!user) {
      return next(new AppError(404, 'User not found'));
    }

    // Attach user info to request
    req.userId = decoded.userId;
    req.user = user;

    next();
  } catch (error) {
    return next(new AppError(401, 'Unauthorized - Token verification failed'));
  }
};

// Backward compatibility alias
export const requireAuth: RequestHandler[] = [authenticate];

