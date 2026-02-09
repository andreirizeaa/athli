import { Router } from 'express';
import { coachSequenceController } from '../coach-sequences.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const coachSequenceRouter = Router();

coachSequenceRouter.get('/', supabaseAuthenticate, coachSequenceController.getSequences);

coachSequenceRouter.get('/:id', supabaseAuthenticate, coachSequenceController.getSequenceById);

coachSequenceRouter.post('/', supabaseAuthenticate, coachSequenceController.createSequence);

coachSequenceRouter.patch('/:id', supabaseAuthenticate, coachSequenceController.updateSequence);

coachSequenceRouter.delete('/:id', supabaseAuthenticate, coachSequenceController.deleteSequence);
