import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';

export const paymentsRouter = Router();

// Webhook — NO auth middleware (Stripe calls this, not a user)
// Raw body is handled by express.raw() in express.ts
paymentsRouter.post('/webhook', paymentsController.webhook);

// Coach: Stripe Connect
paymentsRouter.get('/connect/status', supabaseAuthenticate, paymentsController.getStatus);
paymentsRouter.post('/connect/onboard', supabaseAuthenticate, paymentsController.onboard);
paymentsRouter.post('/connect/dashboard-link', supabaseAuthenticate, paymentsController.dashboardLink);

// Coach: Packages
paymentsRouter.get('/packages', supabaseAuthenticate, paymentsController.getPackages);
paymentsRouter.post('/packages/sync', supabaseAuthenticate, paymentsController.syncPackages);
paymentsRouter.post('/packages', supabaseAuthenticate, paymentsController.createPackage);
paymentsRouter.patch('/packages/:packageId/toggle', supabaseAuthenticate, paymentsController.togglePackage);
paymentsRouter.patch('/packages/:packageId', supabaseAuthenticate, paymentsController.updatePackage);
paymentsRouter.delete('/packages/:packageId', supabaseAuthenticate, paymentsController.deletePackage);

// Stripe Sync
paymentsRouter.post('/sync-to-stripe', supabaseAuthenticate, paymentsController.backfillStripe);

// Discount Codes
paymentsRouter.get('/codes', supabaseAuthenticate, paymentsController.getCodes);
paymentsRouter.post('/codes', supabaseAuthenticate, paymentsController.createCode);
paymentsRouter.patch('/codes/:codeId', supabaseAuthenticate, paymentsController.updateCode);
paymentsRouter.delete('/codes/:codeId', supabaseAuthenticate, paymentsController.deleteCode);

// Coach: Onboardings (for package creation dropdown)
paymentsRouter.get('/onboardings', supabaseAuthenticate, paymentsController.getOnboardings);

// Coach: Sequences (for package creation dropdown)
paymentsRouter.get('/sequences', supabaseAuthenticate, paymentsController.getSequences);

// Public: Packages by coach code (no auth)
paymentsRouter.get('/public/packages/:coachCode', paymentsController.getPublicPackages);

// Coach: Package Assignments
paymentsRouter.post('/packages/:packageId/assign', supabaseAuthenticate, paymentsController.assignPackage);
paymentsRouter.delete('/packages/:packageId/assign/:clientId', supabaseAuthenticate, paymentsController.unassignPackage);
paymentsRouter.get('/packages/:packageId/assignments', supabaseAuthenticate, paymentsController.getPackageAssignments);
paymentsRouter.get('/clients/:clientId/assignments', supabaseAuthenticate, paymentsController.getClientAssignments);
