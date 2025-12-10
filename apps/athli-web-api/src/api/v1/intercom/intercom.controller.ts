import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import { IntercomService } from '../../../services/intercom.service';
import { AppError } from '../../../middlewares/error-handler';

const intercomService = new IntercomService();

export async function intercomJWTController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;

    if (!user) {
      return next(new AppError(404, 'User not found'));
    }

    const emailAddress = user.emailAddresses?.[0]?.emailAddress;

    const token = intercomService.generateJWT({
      id: user.id,
      email: emailAddress,
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

