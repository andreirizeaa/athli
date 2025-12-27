import { Router } from 'express';
import { clientBaseRouter } from './routes/clients.routes';
import { clientFileRouter } from './routes/files.routes';
import { clientHabitRouter } from './routes/habits.routes';
import { clientMetricRouter } from './routes/metrics.routes';
import { clientPhotoRouter } from './routes/photos.routes';
import { clientTrainingRouter } from './routes/training/index.routes';
import { clientCheckInRouter } from './routes/forms/check-ins.routes';
import { clientQuestionnaireRouter } from './routes/forms/questionnaires.routes';
import { clientNoteRouter } from './routes/notes.routes';
import { clientProfileController } from './client-profile.controller';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';

export const clientRouter = Router();

// Flattened routes
clientRouter.get('/ping', (req, res) => res.status(200).send('pong'));
clientRouter.use('/', clientBaseRouter);
clientRouter.use('/files', clientFileRouter);
clientRouter.use('/forms/check-ins', clientCheckInRouter);
clientRouter.use('/forms/questionnaires', clientQuestionnaireRouter);
clientRouter.use('/habits', clientHabitRouter);
clientRouter.use('/metrics', clientMetricRouter);
clientRouter.use('/photos', clientPhotoRouter);
clientRouter.use('/trainings', clientTrainingRouter);
clientRouter.use('/notes', clientNoteRouter);
