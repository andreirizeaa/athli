import { Router } from 'express';
import { searchController } from './search.controller';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';

const router = Router();

// Apply auth middleware to all search routes
router.use(supabaseAuthenticate);

router.get('/', searchController.globalSearch);

export default router;
