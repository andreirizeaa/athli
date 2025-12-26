import { Router } from 'express';
import { authRouter } from '../auth/auth.routes';
import { intercomRouter } from '../intercom/intercom.routes';
import { userRouter } from '../user/user.routes';
import { clientRouter } from '../client/client.routes';
import { coachRouter } from '../coach/coach.routes';
import { exercisesRouter } from '../exercises/exercises.routes';
import { settingsRouter } from '../settings/settings.routes';
import searchRouter from '../search';

export const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/intercom', intercomRouter);
v1Router.use('/user', userRouter);
v1Router.use('/client', clientRouter);
v1Router.use('/coach', coachRouter);
v1Router.use('/exercises', exercisesRouter);
v1Router.use('/settings', settingsRouter);
v1Router.use('/search', searchRouter);

