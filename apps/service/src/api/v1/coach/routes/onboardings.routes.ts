import { Router } from 'express';
import { coachOnboardingController } from '../coach-onboardings.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const coachOnboardingRouter = Router();

coachOnboardingRouter.get('/', supabaseAuthenticate, coachOnboardingController.getOnboardings);

coachOnboardingRouter.get('/:id', supabaseAuthenticate, coachOnboardingController.getOnboardingById);

coachOnboardingRouter.post('/', supabaseAuthenticate, coachOnboardingController.createOnboarding);

coachOnboardingRouter.patch('/:id', supabaseAuthenticate, coachOnboardingController.updateOnboarding);

coachOnboardingRouter.delete('/:id', supabaseAuthenticate, coachOnboardingController.deleteOnboarding);
