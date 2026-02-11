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
paymentsRouter.delete('/connect/disconnect', supabaseAuthenticate, paymentsController.disconnect);

// Coach: Summary Dashboard
paymentsRouter.get('/summary/analytics', supabaseAuthenticate, paymentsController.getSummaryAnalytics);
paymentsRouter.get('/summary/activity', supabaseAuthenticate, paymentsController.getSummaryActivity);

// Coach: Packages
paymentsRouter.get('/packages/stats', supabaseAuthenticate, paymentsController.getAllPackageStats);
paymentsRouter.get('/packages/:packageId/redemptions', supabaseAuthenticate, paymentsController.getPackageCouponRedemptions);
paymentsRouter.get('/packages', supabaseAuthenticate, paymentsController.getPackages);
paymentsRouter.post('/packages/sync', supabaseAuthenticate, paymentsController.syncPackages);
paymentsRouter.post('/packages', supabaseAuthenticate, paymentsController.createPackage);
paymentsRouter.patch('/packages/:packageId/toggle', supabaseAuthenticate, paymentsController.togglePackage);
paymentsRouter.patch('/packages/:packageId', supabaseAuthenticate, paymentsController.updatePackage);
paymentsRouter.delete('/packages/:packageId', supabaseAuthenticate, paymentsController.deletePackage);

// Stripe Sync
paymentsRouter.post('/sync-to-stripe', supabaseAuthenticate, paymentsController.backfillStripe);

// Coupons
paymentsRouter.get('/coupons', supabaseAuthenticate, paymentsController.getCoupons);
paymentsRouter.post('/coupons', supabaseAuthenticate, paymentsController.createCoupon);
paymentsRouter.patch('/coupons/:couponId', supabaseAuthenticate, paymentsController.updateCoupon);
paymentsRouter.delete('/coupons/:couponId', supabaseAuthenticate, paymentsController.deleteCoupon);

// Coach: Onboardings (for package creation dropdown)
paymentsRouter.get('/onboardings', supabaseAuthenticate, paymentsController.getOnboardings);

// Coach: Sequences (for package creation dropdown)
paymentsRouter.get('/sequences', supabaseAuthenticate, paymentsController.getSequences);

// Public: Packages by coach code (no auth)
paymentsRouter.get('/public/packages/:coachCode', paymentsController.getPublicPackages);

// Public: Create checkout session (no auth, but validates clientId exists)
// Security: Validates client exists in DB, package is active, checks for duplicates
paymentsRouter.post('/public/checkout/session', paymentsController.createPublicCheckoutSession);

// Client: Create checkout session (requires auth) - kept for backwards compatibility
paymentsRouter.post('/checkout/session', supabaseAuthenticate, paymentsController.createCheckoutSession);

// Coach: Package Assignments
paymentsRouter.post('/packages/:packageId/assign', supabaseAuthenticate, paymentsController.assignPackage);
paymentsRouter.delete('/packages/:packageId/assign/:clientId', supabaseAuthenticate, paymentsController.unassignPackage);
paymentsRouter.get('/packages/:packageId/assignments', supabaseAuthenticate, paymentsController.getPackageAssignments);
paymentsRouter.get('/clients/:clientId/assignments', supabaseAuthenticate, paymentsController.getClientAssignments);

// Client: Self-service billing
paymentsRouter.get('/client/packages', supabaseAuthenticate, paymentsController.getMyPackages);
paymentsRouter.post('/client/billing-portal', supabaseAuthenticate, paymentsController.createBillingPortalSession);
