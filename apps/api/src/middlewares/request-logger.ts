import { Request, Response, NextFunction } from 'express';

export function requestLogger(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  // extra per-request logging if needed; pino-http already logs core info
  next();
}

