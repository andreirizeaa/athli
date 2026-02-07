import { Router } from 'express';
import { coachInviteCodesController } from '../coach-invite-codes.controller';
import { supabaseAuthenticate } from '../../../../middlewares/supabase-auth';

export const coachInviteCodeRouter = Router();

coachInviteCodeRouter.post('/', supabaseAuthenticate, coachInviteCodesController.getOrCreateInviteCode);
coachInviteCodeRouter.get('/', supabaseAuthenticate, coachInviteCodesController.getInviteCodes);
