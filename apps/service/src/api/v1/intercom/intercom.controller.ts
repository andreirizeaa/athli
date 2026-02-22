import { Request, Response, NextFunction } from 'express';
import { IntercomService } from '../../../services/intercom.service';
import { AppError } from '../../../middlewares/error-handler';
import { getSupabaseClient } from '../../../services/supabase.service';

const intercomService = new IntercomService();

export async function intercomJWTController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return next(new AppError(401, 'User not authenticated'));
    }

    // Fetch user details for Intercom JWT
    const supabase = getSupabaseClient();
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return next(new AppError(404, 'User not found'));
    }

    const token = intercomService.generateJWT({
      id: user.id,
      email: user.email,
    });

    res.status(200).json({ jwt: token });
  } catch (err) {
    if (err instanceof Error) {
      return next(
        new AppError(
          500,
          'Failed to generate JWT token',
          err.message
        )
      );
    }
    next(err);
  }
}
