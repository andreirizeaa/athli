import { Router } from 'express';
import { authRouter } from '../auth/auth.routes';
import { intercomRouter } from '../intercom/intercom.routes';
import { userRouter } from '../user/user.routes';

export const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/intercom', intercomRouter);
v1Router.use('/user', userRouter);

