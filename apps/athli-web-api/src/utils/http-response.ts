import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200) {
  res.status(statusCode).json({ data });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  details?: unknown
) {
  res.status(statusCode).json({
    error: {
      message,
      ...(details ? { details } : {}),
    },
  });
}

interface ResponseData {
  message?: string;
  data?: any;
}

export function success(res: Response, payload: ResponseData): void {
  res.status(200).json({
    success: true,
    ...payload,
  });
}

export function created(res: Response, payload: ResponseData): void {
  res.status(201).json({
    success: true,
    ...payload,
  });
}

export function unauthorized(res: Response, payload: ResponseData): void {
  res.status(401).json({
    success: false,
    ...payload,
  });
}

export function notFound(res: Response, payload: ResponseData): void {
  res.status(404).json({
    success: false,
    ...payload,
  });
}


export function forbidden(res: Response, payload: ResponseData): void {
  res.status(403).json({
    success: false,
    ...payload,
  });
}

export function internalError(res: Response, payload: ResponseData): void {
  res.status(500).json({
    success: false,
    ...payload,
  });
}

export function noContent(res: Response): void {
  res.status(204).send();
}
