import { Router } from 'express';
import { billingController } from './billing.controller';
import { supabaseAuthenticate } from '../../../middlewares/supabase-auth';

export const billingRouter = Router();

// Webhook - NO auth (Stripe calls this)
billingRouter.post('/webhook', billingController.webhook);

// Public: Lookup referral code info (no auth - for referral landing page)
billingRouter.get('/referral-lookup/:code', billingController.lookupReferralCode);

// Coach: Get current subscription
billingRouter.get('/subscription', supabaseAuthenticate, billingController.getSubscription);

// Coach: Get entitlements (for feature gates)
billingRouter.get('/entitlements', supabaseAuthenticate, billingController.getEntitlements);

// Coach: Get billing activity log
billingRouter.get('/activity', supabaseAuthenticate, billingController.getBillingActivity);

// Coach: Get referrals and credit stats
billingRouter.get('/referrals', supabaseAuthenticate, billingController.getReferrals);

// Coach: Send referral invite email
billingRouter.post('/referral-invite', supabaseAuthenticate, billingController.sendReferralInvite);

// Coach: Apply a referral code (link as referred)
billingRouter.post('/apply-referral', supabaseAuthenticate, billingController.applyReferralCode);

// Coach: Get invoices from Stripe
billingRouter.get('/invoices', supabaseAuthenticate, billingController.getInvoices);

// Coach: Create checkout session for plan/addons
billingRouter.post('/checkout', supabaseAuthenticate, billingController.createCheckoutSession);

// Coach: Create customer portal session (manage billing in Stripe)
billingRouter.post('/portal', supabaseAuthenticate, billingController.createPortalSession);

// Coach: Update plan (upgrade/downgrade)
billingRouter.patch('/plan', supabaseAuthenticate, billingController.updatePlan);

// Coach: Update addons (add/remove)
billingRouter.patch('/addons', supabaseAuthenticate, billingController.updateAddons);

// Coach: Update subscription (unified plan + addons with single invoice)
billingRouter.patch('/subscription', supabaseAuthenticate, billingController.updateSubscription);

// Coach: Cancel addon (schedule for end of period)
billingRouter.post('/addons/:addonType/cancel', supabaseAuthenticate, billingController.cancelAddon);

// Coach: Reactivate addon (undo scheduled cancellation)
billingRouter.post('/addons/:addonType/reactivate', supabaseAuthenticate, billingController.reactivateAddon);

// Coach: Cancel subscription
billingRouter.post('/cancel', supabaseAuthenticate, billingController.cancelSubscription);

// Coach: Reactivate subscription (if scheduled for cancellation)
billingRouter.post('/reactivate', supabaseAuthenticate, billingController.reactivateSubscription);

// AI Assistant usage tracking (for trial limits)
billingRouter.get('/ai-usage', supabaseAuthenticate, billingController.getAiPromptUsage);
billingRouter.post('/ai-usage/check', supabaseAuthenticate, billingController.checkAndIncrementAiPrompt);
