import { Request, Response, NextFunction } from 'express';
import { detectEmailProvider } from '../../../services/provider-detection.service';
import { AppError } from '../../../middlewares/error-handler';

export async function detectProviderController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const email = req.query.email as string;

    if (!email) {
      return next(new AppError(400, 'Email is required'));
    }

    const provider = await detectEmailProvider(email);
    res.status(200).json({ provider });
  } catch (err) {
    if (err instanceof Error) {
      return next(new AppError(400, err.message));
    }
    next(err);
  }
}

