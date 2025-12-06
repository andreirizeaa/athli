import { Router } from 'express';
import { userRouter } from './user.routes';
import { calendarRouter } from '../calendar/calendar.routes';
import { emailRouter } from '../email/email.routes';
import { intercomRouter } from '../intercom/intercom.routes';
import { providerRouter } from '../provider/provider.routes';

export const v1Router = Router();

v1Router.use('/users', userRouter);
v1Router.use('/calendar', calendarRouter);
v1Router.use('/email', emailRouter);
v1Router.use('/intercom', intercomRouter);
v1Router.use('/provider', providerRouter);

