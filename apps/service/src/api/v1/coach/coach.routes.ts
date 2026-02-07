import { Router } from 'express';
// coachClientRouter removed
import { coachFileRouter } from './routes/files.routes';
import { coachCodeRouter } from './routes/code.routes';
import { coachFlowRouter } from './routes/flows.routes';
import { coachOnboardingRouter } from './routes/onboardings.routes';
import { coachHabitRouter } from './routes/habits.routes';
import { coachMetricRouter } from './routes/metrics.routes';
import { coachExerciseRouter } from './routes/training/exercises.routes';
import { coachWorkoutRouter } from './routes/training/workouts.routes';
import { coachSectionRouter } from './routes/training/sections.routes';
import { coachProgramRouter } from './routes/training/programs.routes';
import { coachCheckInRouter } from './routes/forms/check-ins.routes';
import { coachQuestionnaireRouter } from './routes/forms/questionnaires.routes';
import { coachTodoRouter } from './routes/todo.routes';
import { coachChecklistRouter } from './routes/new/checklist.routes';
import { coachMessagingRouter } from './routes/messaging.routes';
import { coachInviteCodeRouter } from './routes/invite-codes.routes';

export const coachRouter = Router();

// Training sub-routes
const trainingRouter = Router();
trainingRouter.use('/exercises', coachExerciseRouter);
trainingRouter.use('/workouts', coachWorkoutRouter);
trainingRouter.use('/sections', coachSectionRouter);
trainingRouter.use('/programs', coachProgramRouter);

// Forms sub-routes
const formsRouter = Router();
formsRouter.use('/check-ins', coachCheckInRouter);
formsRouter.use('/questionnaires', coachQuestionnaireRouter);

// New sub-routes
const newRouter = Router();
newRouter.use('/checklist', coachChecklistRouter);

// clients route removed
coachRouter.use('/training', trainingRouter);
coachRouter.use('/files', coachFileRouter);
coachRouter.use('/flows', coachFlowRouter);
coachRouter.use('/onboardings', coachOnboardingRouter);
coachRouter.use('/forms', formsRouter);
coachRouter.use('/habits', coachHabitRouter);
coachRouter.use('/metrics', coachMetricRouter);
coachRouter.use('/todo', coachTodoRouter);
coachRouter.use('/new', newRouter);
coachRouter.use('/messaging', coachMessagingRouter);
coachRouter.use('/invite-codes', coachInviteCodeRouter);
coachRouter.use('/', coachCodeRouter);
