import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import { EmailService } from '../../../services/email.service';
import { AppError } from '../../../middlewares/error-handler';

const emailService = new EmailService();

export async function emailCallbackController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId!;
    const { provider_access_token, access_token, provider_refresh_token, refresh_token, provider } = req.body;

    const accessToken = provider_access_token || access_token;
    const refreshToken = provider_refresh_token || refresh_token;

    if (!accessToken) {
      return next(new AppError(400, 'Missing access token'));
    }

    if (!provider) {
      return next(new AppError(400, 'Missing provider'));
    }

    await emailService.saveTokens(userId, accessToken, refreshToken, provider);

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function emailStatusController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId!;
    const status = await emailService.getStatus(userId);
    res.status(200).json(status);
  } catch (err) {
    next(err);
  }
}

