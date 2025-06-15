
'use server';

import { redirect } from 'next/navigation';
import { stripe, isStripeEnabled } from '@/lib/stripe';
import { auth } from '@/lib/firebase'; // To get current user
import { getUserById } from '@/lib/mock-data'; // To get user email/Stripe customer ID

// This is a placeholder for your Premium Plan's Price ID from Stripe
// You MUST replace this with the actual Price ID you created in your Stripe Dashboard.
const STRIPE_PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID;

// Get base URL from environment variables
const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL;

export async function createCheckoutSessionAction(): Promise<{ error?: string; sessionId?: string; url?: string | null }> {
  if (!isStripeEnabled()) {
    return { error: 'Stripe is not configured on the server. Please check API keys.' };
  }

  if (!STRIPE_PREMIUM_PRICE_ID) {
    return { error: 'Stripe Premium Price ID is not configured. Please set STRIPE_PREMIUM_PRICE_ID in your App Hosting environment variables.' };
  }

  if (!appBaseUrl || !(appBaseUrl.startsWith('https://') || appBaseUrl.startsWith('http://localhost'))) {
    console.error("CRITICAL: NEXT_PUBLIC_APP_BASE_URL is not set, not HTTPS for production, or not http://localhost for dev. This is required for Stripe Checkout redirects.");
    return { error: 'Application base URL is not configured correctly. Please set NEXT_PUBLIC_APP_BASE_URL to your live HTTPS URL (or http://localhost for local dev) in your environment variables.' };
  }

  const currentUser = auth?.currentUser;
  if (!currentUser || !currentUser.uid) {
    return { error: 'You must be logged in to subscribe.' };
  }

  let userProfile;
  try {
    userProfile = await getUserById(currentUser.uid);
  } catch (e) {
    console.error("Failed to fetch user profile:", e);
    return { error: "Could not retrieve user profile information."};
  }

  if (!userProfile) {
    return { error: 'User profile not found.' };
  }

  const successUrl = `${appBaseUrl}/profile?session_id={CHECKOUT_SESSION_ID}&status=success`;
  const cancelUrl = `${appBaseUrl}/pricing?status=cancelled`; // Changed to /pricing on cancel

  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userProfile.stripeCustomerId ? undefined : userProfile.email,
      customer: userProfile.stripeCustomerId || undefined,
      metadata: {
        firebaseUID: currentUser.uid,
      },
    };

    const session = await stripe.checkout.sessions.create(params);

    if (session.url) {
      redirect(session.url);
      // The redirect function throws an error to stop execution,
      // so this return might not be reached.
      return { sessionId: session.id, url: session.url };
    } else {
      return { error: 'Could not create Stripe Checkout session URL.' };
    }

  } catch (error: any) {
    console.error('Stripe Checkout Session Error:', error);
    return { error: `Failed to create Stripe session: ${error.message}` };
  }
}
