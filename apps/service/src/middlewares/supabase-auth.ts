import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from './error-handler';
import { getSupabaseClient } from '../services/supabase.service';

export interface SupabaseAuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

// Supabase JWT authentication middleware
export const supabaseAuthenticate: RequestHandler = async (
  req: SupabaseAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError(401, 'Unauthorized - Missing or invalid token'));
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseClient();

    // Verify the Supabase JWT token using the admin API
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new AppError(401, 'Unauthorized - Invalid token'));
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is okay - use metadata
      console.warn('Profile fetch error:', profileError);
    }

    // Attach user info to request
    req.userId = user.id;
    req.user = {
      id: user.id,
      email: user.email || '',
      firstName: profile?.first_name || (user.user_metadata?.first_name as string) || '',
      lastName: profile?.last_name || (user.user_metadata?.last_name as string) || '',
    };

    next();
  } catch (error) {
    return next(new AppError(401, 'Unauthorized - Token verification failed'));
  }
};

