import { Router } from 'express';
import { clientBaseRouter } from './routes/clients.routes';
import { clientFileRouter } from './routes/files.routes';
import { clientHabitRouter } from './routes/habits.routes';
import { clientMetricRouter } from './routes/metrics.routes';
import { clientPhotoRouter } from './routes/photos.routes';
import { clientTrainingRouter } from './routes/trainings.routes';
import { clientCheckInRouter } from './routes/forms/check-ins.routes';
import { clientQuestionnaireRouter } from './routes/forms/questionnaires.routes';

export const clientRouter = Router();

// Forms sub-routes
const formsRouter = Router();
formsRouter.use('/check-ins', clientCheckInRouter);
formsRouter.use('/questionnaires', clientQuestionnaireRouter);

clientRouter.use('/', clientBaseRouter);
clientRouter.use('/files', clientFileRouter);
clientRouter.use('/forms', formsRouter);
clientRouter.use('/habits', clientHabitRouter);
clientRouter.use('/metrics', clientMetricRouter);
clientRouter.use('/photos', clientPhotoRouter);
clientRouter.use('/trainings', clientTrainingRouter);
