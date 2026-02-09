import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export const getStripeClient = (): Stripe => {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY');
    }

    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
};
