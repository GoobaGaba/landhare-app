
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: STRIPE_SECRET_KEY is not set in production environment.');
    // In production, you might want to throw an error or prevent the app from starting
    // throw new Error('STRIPE_SECRET_KEY is not set.');
  } else {
    console.warn('WARNING: STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled. Please set it in your .env.local file.');
  }
}

// Initialize Stripe with the API version and secret key.
// TypeScript might complain about stripeSecretKey potentially being undefined here.
// The check above handles the warning/error, but for type safety,
// we provide a default empty string, though Stripe will fail if it's truly empty.
export const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2024-06-20', // Use the latest API version
  typescript: true, // Enable TypeScript support
});

// Helper function to check if Stripe is configured
export function isStripeEnabled(): boolean {
  return !!stripeSecretKey && stripeSecretKey !== '';
}
