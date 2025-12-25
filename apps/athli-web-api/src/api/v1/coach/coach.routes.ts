import { Router } from 'express';
import { coachClientRouter } from './routes/clients.routes';
import { coachFileRouter } from './routes/files.routes';
import { coachFlowRouter } from './routes/flows.routes';
import { coachHabitRouter } from './routes/habits.routes';
import { coachMetricRouter } from './routes/metrics.routes';
import { coachNoteRouter } from './routes/notes.routes';
import { coachExerciseRouter } from './routes/training/exercises.routes';
import { coachWorkoutRouter } from './routes/training/workouts.routes';
import { coachProgramRouter } from './routes/training/programs.routes';
import { coachCheckInRouter } from './routes/forms/check-ins.routes';
import { coachQuestionnaireRouter } from './routes/forms/questionnaires.routes';

export const coachRouter = Router();

// Training sub-routes
const trainingRouter = Router();
trainingRouter.use('/exercises', coachExerciseRouter);
trainingRouter.use('/workouts', coachWorkoutRouter);
trainingRouter.use('/programs', coachProgramRouter);

// Forms sub-routes
const formsRouter = Router();
formsRouter.use('/check-ins', coachCheckInRouter);
formsRouter.use('/questionnaires', coachQuestionnaireRouter);

coachRouter.use('/clients', coachClientRouter);
coachRouter.use('/training', trainingRouter);
coachRouter.use('/files', coachFileRouter);
coachRouter.use('/flows', coachFlowRouter);
coachRouter.use('/forms', formsRouter);
coachRouter.use('/habits', coachHabitRouter);
coachRouter.use('/metrics', coachMetricRouter);
coachRouter.use('/notes', coachNoteRouter);
