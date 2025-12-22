import { Router } from 'express';
import { authRouter } from '../auth/auth.routes';
import { intercomRouter } from '../intercom/intercom.routes';

export const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/intercom', intercomRouter);

