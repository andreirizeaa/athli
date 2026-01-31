import { Router } from 'express';
import { authRouter } from '../auth/auth.routes';
import { coachAuthRouter } from '../auth/coach-auth.routes';
import { clientAuthRouter } from '../auth/client-auth.routes';
import { intercomRouter } from '../intercom/intercom.routes';
import { userRouter } from '../user/user.routes';
import { clientRouter } from '../client/client.routes';
import { coachRouter } from '../coach/coach.routes';
import { coachClientRouter } from '../client/routes/coach-clients.routes';
import { exercisesRouter } from '../exercises/exercises.routes';
import { settingsRouter } from '../settings/settings.routes';
import searchRouter from '../search';
import { featureRequestsRouter } from '../feature-requests/feature-requests.routes';
import { aiRouter } from '../ai/ai.routes';
import { seedDataRouter } from '../seed-data/seed-data.routes';

export const v1Router = Router();

// Auth routes: shared + type-specific
v1Router.use('/auth', authRouter);
v1Router.use('/auth/coach', coachAuthRouter);
v1Router.use('/auth/client', clientAuthRouter);

v1Router.use('/intercom', intercomRouter);
v1Router.use('/user', userRouter);
v1Router.use('/client', clientRouter);
v1Router.use('/clients', coachClientRouter);
v1Router.use('/coach', coachRouter);
v1Router.use('/exercises', exercisesRouter);
v1Router.use('/settings', settingsRouter);
v1Router.use('/search', searchRouter);
v1Router.use('/feature-requests', featureRequestsRouter);
v1Router.use('/ai', aiRouter);
v1Router.use('/seed-data', seedDataRouter);
