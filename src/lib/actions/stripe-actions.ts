
'use server';

import { redirect } from 'next/navigation';
import { stripe, isStripeEnabled } from '@/lib/stripe';
import { auth } from '@/lib/firebase'; // To get current user
import { getUserById } from '@/lib/mock-data'; // To get user email/Stripe customer ID

// This is a placeholder for your Premium Plan's Price ID from Stripe
// You MUST replace this with the actual Price ID you created in your Stripe Dashboard.
const STRIPE_PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID;

// Get base URL from environment variables
const appBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:9002';

export async function createCheckoutSessionAction(): Promise<{ error?: string; sessionId?: string; url?: string | null }> {
  if (!isStripeEnabled()) {
    return { error: 'Stripe is not configured on the server. Please check API keys.' };
  }

  if (!STRIPE_PREMIUM_PRICE_ID) {
    return { error: 'Stripe Premium Price ID is not configured. Please set STRIPE_PREMIUM_PRICE_ID in .env.local.' };
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
  const cancelUrl = `${appBaseUrl}/pricing?status=cancelled`;

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
      // Pre-fill customer email. If user already has a stripeCustomerId, use it.
      // This helps Stripe link the Checkout session to an existing customer or create a new one.
      customer_email: userProfile.stripeCustomerId ? undefined : userProfile.email,
      customer: userProfile.stripeCustomerId || undefined,
      // Add metadata to link the Stripe session/customer to your Firebase user
      metadata: {
        firebaseUID: currentUser.uid,
      },
      // If it's a new customer, you can pass customer_creation: 'always'
      // or handle it by creating/updating the customer on successful checkout via webhook.
      // For subscriptions, Stripe often creates a customer if one doesn't exist with the email.
    };

    const session = await stripe.checkout.sessions.create(params);

    if (session.url) {
      // Instead of returning the URL, we will redirect.
      // This is a server action, so redirect needs to be called from here.
      redirect(session.url);
      // The redirect function throws an error to stop execution and trigger the redirect,
      // so the return statement below might not be reached if redirect is successful.
      // However, to satisfy TypeScript, we can keep it.
      return { sessionId: session.id, url: session.url };
    } else {
      return { error: 'Could not create Stripe Checkout session URL.' };
    }

  } catch (error: any) {
    console.error('Stripe Checkout Session Error:', error);
    return { error: `Failed to create Stripe session: ${error.message}` };
  }
}
