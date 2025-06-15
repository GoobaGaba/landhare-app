
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe'; // Your Stripe utility
import { updateUserProfile } from '@/lib/mock-data'; // Or your actual Firestore update function

// Ensure this is set in your .env.local and App Hosting environment variables
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error('Stripe webhook secret is not configured.');
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }

  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No stripe-signature header found.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Error verifying webhook signature: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout session completed:', session.id);

      // Retrieve metadata and customer details
      const firebaseUID = session.metadata?.firebaseUID;
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

      if (!firebaseUID) {
        console.error('Firebase UID not found in session metadata for session:', session.id);
        // Still return 200 to Stripe, but log the error for investigation.
        return NextResponse.json({ received: true, error: 'Firebase UID missing in metadata' });
      }
      
      if (!stripeCustomerId) {
        console.error('Stripe Customer ID not found in session for session:', session.id);
        return NextResponse.json({ received: true, error: 'Stripe Customer ID missing' });
      }

      try {
        // Update user profile in your database (e.g., Firestore)
        await updateUserProfile(firebaseUID, {
          subscriptionStatus: 'premium',
          stripeCustomerId: stripeCustomerId,
        });
        console.log(`Successfully updated user ${firebaseUID} to premium. Stripe Customer ID: ${stripeCustomerId}`);
      } catch (dbError: any) {
        console.error(`Database error updating user ${firebaseUID}:`, dbError);
        // If the DB update fails, Stripe has still processed the payment.
        // You'll need a way to reconcile this (e.g., manual update or retry mechanism).
        // For now, we still return 200 to Stripe to acknowledge receipt.
        return NextResponse.json({ received: true, error: 'Database update failed after payment.' });
      }
      break;

    // Add other event types to handle here if needed (e.g., subscription cancellations, payment failures)
    // case 'customer.subscription.deleted':
    //   const subscriptionDeleted = event.data.object as Stripe.Subscription;
    //   // Handle subscription cancellation: update user's status to 'free'
    //   // You'd need to find the user by subscriptionDeleted.customer (Stripe Customer ID)
    //   console.log('Subscription deleted:', subscriptionDeleted.id);
    //   break;

    // case 'invoice.payment_failed':
    //   const invoicePaymentFailed = event.data.object as Stripe.Invoice;
    //   // Handle payment failure: notify user, potentially downgrade subscription
    //   console.log('Invoice payment failed:', invoicePaymentFailed.id);
    //   break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
