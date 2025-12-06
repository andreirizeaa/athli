import { Request, Response, NextFunction, RequestHandler } from 'express';
import { clerkClient, requireAuth as clerkRequireAuth } from '@clerk/express';
import { AppError } from './error-handler';

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId?: string;
    sessionId?: string;
  };
  userId?: string;
  user?: {
    id: string;
    emailAddresses?: Array<{ emailAddress: string }>;
  };
}

// Use Clerk's built-in middleware and extend it
export const requireAuth: RequestHandler[] = [
  clerkRequireAuth(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth?.userId;

      if (!userId) {
        return next(new AppError(401, 'Unauthorized - Missing user ID'));
      }

      // Get user details
      const user = await clerkClient.users.getUser(userId);

      if (!user) {
        return next(new AppError(404, 'User not found'));
      }

      // Attach user info to request
      req.userId = userId;
      req.user = {
        id: user.id,
        emailAddresses: user.emailAddresses.map((email) => ({
          emailAddress: email.emailAddress,
        })),
      };

      next();
    } catch (error) {
      return next(new AppError(401, 'Unauthorized - Token verification failed'));
    }
  },
];

