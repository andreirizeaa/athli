import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import { CalendarService } from '../../../services/calendar.service';
import { AppError } from '../../../middlewares/error-handler';

const calendarService = new CalendarService();

export async function calendarCallbackController(
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

    await calendarService.saveTokens(userId, accessToken, refreshToken, provider);

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function calendarDisconnectController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId!;
    await calendarService.disconnect(userId);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function calendarEventsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId!;
    const timeMin = req.query.timeMin
      ? new Date(req.query.timeMin as string)
      : new Date();
    const timeMax = req.query.timeMax
      ? new Date(req.query.timeMax as string)
      : new Date(Date.now() + 30 * 24 * 3600 * 1000);

    const events = await calendarService.getEvents(userId, timeMin, timeMax);
    res.status(200).json(events);
  } catch (err) {
    let errorMessage = 'Failed to fetch calendar events';
    let statusCode = 500;

    if (err instanceof Error) {
      errorMessage = err.message;

      if (err.message.includes('No calendar linked')) {
        statusCode = 400;
      } else if (
        err.message.includes('expired') ||
        err.message.includes('invalid_token') ||
        err.message.includes('unauthorized')
      ) {
        statusCode = 401;
      } else if (
        err.message.includes('permission') ||
        err.message.includes('Forbidden')
      ) {
        statusCode = 403;
      }
    }

    return next(new AppError(statusCode, errorMessage));
  }
}

export async function calendarStatusController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId!;
    const status = await calendarService.getStatus(userId);
    res.status(200).json(status);
  } catch (err) {
    next(err);
  }
}

